import crypto from "node:crypto";
import sql from '../sql-driver.js';
import { getRawPool } from "../db.js";
import { createPaymentIntent, paymentDetails } from '../services/customerPaymentIntents.js';
import { payosConfigured } from '../services/payos.js';

/** Allowed fixed denominations (VND). */
export const GIFT_CARD_AMOUNTS = [500_000, 1_000_000, 2_000_000];

const GIFT_CARD_AMOUNT_SET = new Set(GIFT_CARD_AMOUNTS);
const PROMOTION_NAME = "Gift Card System";
const PROMO_CODE_PREFIX = "GIFT-";
const PROMO_CODE_SUFFIX_LENGTH = 10;
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MAX_CODE_ATTEMPTS = 8;

function isUniqueConstraintError(error) {
  const number = error?.number ?? error?.originalError?.number;
  if (number === 2627 || number === 2601) return true;
  const message = String(error?.message ?? "");
  return message.includes("UQ_PromoCodes_code") || /unique|duplicate/i.test(message);
}

function generatePromoCodeSuffix(length = PROMO_CODE_SUFFIX_LENGTH) {
  let suffix = "";
  for (let i = 0; i < length; i += 1) {
    suffix += CODE_CHARS[crypto.randomInt(0, CODE_CHARS.length)];
  }
  return suffix;
}

function buildGiftPromoCode() {
  return `${PROMO_CODE_PREFIX}${generatePromoCodeSuffix()}`;
}

async function findGiftCardPromotionId(transaction, amount) {
  const request = transaction.request();
  request.input("promotionName", sql.NVarChar(150), PROMOTION_NAME);
  request.input("discountValue", sql.Decimal(12, 2), amount);

  const result = await request.query(
    `SELECT TOP 1 promotion_id
     FROM dbo.Promotions WITH (UPDLOCK,HOLDLOCK)
     WHERE promotion_name = @promotionName
       AND discount_type = N'Fixed'
       AND discount_value = @discountValue AND is_active=1 AND end_at>SYSDATETIME();`
  );

  return result.recordset[0]?.promotion_id ?? null;
}

async function createGiftCardPromotion(transaction, amount) {
  const startAt = new Date();
  const endAt = new Date(startAt);
  endAt.setFullYear(endAt.getFullYear() + 1);

  const request = transaction.request();
  request.input("promotionName", sql.NVarChar(150), PROMOTION_NAME);
  request.input(
    "description",
    sql.NVarChar(1000),
    `Fixed-value gift card (${amount.toLocaleString("en-US")} VND)`
  );
  request.input("discountValue", sql.Decimal(12, 2), amount);
  request.input("startAt", sql.DateTime2, startAt);
  request.input("endAt", sql.DateTime2, endAt);

  const result = await request.query(
    `INSERT INTO dbo.Promotions
       (promotion_name, description, discount_type, discount_value,
        min_order_value, max_discount, start_at, end_at, is_active, created_by_staff_id)
     OUTPUT INSERTED.promotion_id
     VALUES
       (@promotionName, @description, N'Fixed', @discountValue,
        0, NULL, @startAt, @endAt, 1, NULL);`
  );

  return result.recordset[0]?.promotion_id ?? null;
}

async function insertGiftPromoCode(transaction, promotionId, promoCode) {
  const request = transaction.request();
  request.input("promotionId", sql.Int, promotionId);
  request.input("promoCode", sql.NVarChar(40), promoCode);

  const result = await request.query(
    `INSERT INTO dbo.PromoCodes
       (promotion_id, promo_code, usage_limit, times_used, is_active)
     OUTPUT INSERTED.promo_code
     VALUES (@promotionId, @promoCode, 1, 0, 1);`
  );

  return result.recordset[0]?.promo_code ?? promoCode;
}

/**
 * POST /api/customer/gift-cards/buy
 * Creates a single-use fixed-value promo code backed by dbo.Promotions + dbo.PromoCodes.
 */
export async function buyGiftCard(req, res) {
  try {
    const amount = Number(req.body?.amount);

    if (!Number.isFinite(amount) || !GIFT_CARD_AMOUNT_SET.has(amount)) {
      return res.status(400).json({
        success: false,
        message: "Invalid gift card amount. Allowed values: 500000, 1000000, 2000000.",
      });
    }

    const reference=req.body.payment_code;
    if (reference) {
      if (typeof reference!=='string' || !/^GFT[A-F0-9]{24}$/.test(reference)) return res.status(400).json({message:'Invalid purchase reference.'});
      const pool=await getRawPool();
      const row=(await pool.request().input('ref',sql.VarChar(32),reference).input('user',sql.Int,req.userId)
        .query('SELECT amount,gift_code FROM dbo.CustomerPaymentIntents WHERE code=@ref AND customer_id=@user AND reservation_id IS NULL')).recordset[0];
      if (!row || row.amount!==amount) return res.status(404).json({message:'Gift card purchase not found.'});
      if (row.gift_code) return res.json({success:true,promo_code:row.gift_code});
      return res.status(202).json({status:'pending',payment_code:reference,...paymentDetails(reference,amount)});
    }
    if (!payosConfigured())
      return res.status(503).json({message:'Gift card bank payments are unavailable.'});
    const code=await createPaymentIntent(req.userId,amount);
    return res.status(202).json({status:'pending',payment_code:code,...paymentDetails(code,amount)});
  } catch (error) {
    console.error('Gift card purchase failed:',error.message);
    return res.status(500).json({message:'Could not process gift card purchase.'});
  }
}

export async function issuePaidGiftCard(transaction, amount) {
  let promotionId=await findGiftCardPromotionId(transaction,amount);
  if (!promotionId) promotionId=await createGiftCardPromotion(transaction,amount);
  for (let i=0;i<MAX_CODE_ATTEMPTS;i++) {
    try { return await insertGiftPromoCode(transaction,promotionId,buildGiftPromoCode()); }
    catch (error) { if (!isUniqueConstraintError(error)) throw error; }
  }
  throw new Error('Could not generate a unique gift card code.');
}
