import { startOrderPayment, tablePaymentHeaders } from '@/features/payment/orderPayment.js';
import { useLanguage } from '@/core/i18n/LanguageProvider.jsx';
import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMenuCart } from '../context/MenuCartContext.jsx';
import { formatVND } from '@/core/utils/formatCurrency';
import { appToastError } from '@/core/notifications/appToast.js';
import toast from 'react-hot-toast';
import { useTableSession } from '@/features/table-session';
import { useNavigate } from 'react-router-dom';
import { resolveDishImage } from '../data/menuAssets.js';


const getStatusColor = (status) => {
  switch (status) {
    case 'Served':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'Ready':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Preparing':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'Pending':
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

function MenuCartDrawer() {
  const { language, translateLabel } = useLanguage();
  const {
    items,
    totalQuantity,
    subtotal,
    isDrawerOpen,
    closeDrawer,
    setQuantity,
    removeItem,
    clearCart,
    addItem,
  } = useMenuCart();

  const panelRef = useRef(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [activeTab, setActiveTab] = useState('cart'); // 'cart' | 'history'

  // History State
  const [history, setHistory] = useState({ preorders: [], sessionOrders: [], summary: null });
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [expandedItemId, setExpandedItemId] = useState(null);

  const { session } = useTableSession();
  const navigate = useNavigate();
  const isDineInQr = session && session.session_status === 'Active';

  // Without a table QR session the cart turns into a reservation pre-order:
  // hand the items to the reservation page and let the customer pick a table and pay.
  const handleReserveWithCart = useCallback(() => {
    if (items.length === 0) return;
    const preorder = {};
    let total = 0;
    items.forEach((item) => {
      const dishId = Number(item.dish_id || item.id);
      if (!dishId) return;
      preorder[dishId] = {
        dish_id: dishId,
        name: item.name,
        dish_name: item.name,
        price: Number(item.price) || 0,
        quantity: Number(item.quantity) || 1,
        category: item.category || item.category_name || '',
        category_name: item.category_name || item.category || '',
      };
      total += (Number(item.price) || 0) * (Number(item.quantity) || 1);
    });
    try {
      localStorage.setItem('phurai_reservation_preorder_items', JSON.stringify(preorder));
      localStorage.setItem('phurai_reservation_preorder_total', String(total));
    } catch {
      /* ignore storage errors */
    }
    clearCart();
    closeDrawer();
    navigate('/reservations');
  }, [items, clearCart, closeDrawer, navigate]);

  // Fetch History Logic
  const fetchHistory = useCallback(async () => {
    if (!session?.token) return;
    setLoadingHistory(true);
    setHistoryError(null);
    try {
      const res = await fetch(`/api/public/qr-order/session/${session.token}/history`);
      const result = await res.json();
      if (result.success) {
        setHistory(result.data);
      } else {
        setHistoryError(result.message || 'Failed to fetch history');
      }
    } catch (err) {
      setHistoryError('Error fetching history');
    } finally {
      setLoadingHistory(false);
    }
  }, [session?.token]);

  useEffect(() => {
    if (isDrawerOpen) {
      if (activeTab === 'history') {
        fetchHistory();
      }
    }
  }, [isDrawerOpen, activeTab, fetchHistory]);

  useEffect(() => {
    if (!isDrawerOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeDrawer();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isDrawerOpen, closeDrawer]);

  useEffect(() => {
    if (isDrawerOpen && panelRef.current) {
      panelRef.current.focus();
    }
  }, [isDrawerOpen]);

  const handleCancelItem = (itemId) => {
    toast(
      (t) => (
        <div className="flex flex-col gap-3 p-1">
          <div className="flex items-center gap-2 text-red-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <span className="font-bold text-gray-900">{translateLabel("Confirm cancel item?")}</span>
          </div>
          <span className="text-sm text-gray-600">{translateLabel("This action cannot be undone. Are you sure?")}</span>
          <div className="flex gap-2 justify-end mt-2">
            <button className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg font-bold text-gray-700 transition-colors" onClick={() => toast.dismiss(t.id)}>{translateLabel("Close")}</button>
            <button className="px-4 py-2 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold transition-colors shadow-sm shadow-red-500/30" onClick={() => {
              toast.dismiss(t.id);
              executeCancel(itemId);
            }}>{translateLabel("Confirm Cancel")}</button>
          </div>
        </div>
      ),
      { duration: Infinity, style: { minWidth: '300px' } }
    );
  };

  const executeCancel = async (itemId) => {
    try {
      const res = await fetch(`/api/public/qr-order/items/${itemId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchHistory(); // Refresh history
        toast.success('Item has been cancelled successfully');
      } else {
        appToastError(data.message || 'Failed to cancel item');
      }
    } catch (err) {
      appToastError('Network error while cancelling item');
    }
  };

  const handleUpdateQuantity = async (itemId, currentQuantity, change) => {
    const newQuantity = currentQuantity + change;
    if (newQuantity < 1) return handleCancelItem(itemId);
    
    try {
      const res = await fetch(`/api/public/qr-order/items/${itemId}/quantity`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQuantity })
      });
      const data = await res.json();
      if (data.success) {
        fetchHistory();
      } else {
        appToastError(data.message || 'Failed to update quantity');
      }
    } catch (err) {
      appToastError('Network error while updating quantity');
    }
  };

  const handleCheckoutCart = async () => {
    if (items.length === 0) return;
    setIsCheckingOut(true);
    try {
      const formattedItems = items.map(item => {
        const realNumericId = typeof item.id === 'number' ? item.id : item.dish_id || item.db_id || item.menu_id || parseInt(item.id, 10);
        return {
          id: item.id,
          dish_id: Number.isFinite(realNumericId) ? realNumericId : undefined,
          name: item.name || item.dish_name || item.title || "",
          price: item.price || item.unit_price || 0,
          category: item.category || item.category_name || '',
          quantity: item.quantity || 1,
          notes: item.notes || ""
        };
      });

      const payload = { items: formattedItems };

      if (isDineInQr) {
        const targetTableId = session?.table_id;
        const targetSessionId = session?.session_id || session?.qr_session_id;

        if (!targetTableId || !targetSessionId) {
          toast.error("Vui lòng quét lại mã QR bàn để kích hoạt phiên gọi món.");
          return;
        }

        const fullPayload = { table_id: targetTableId, session_id: targetSessionId, items: payload.items };
        const res = await fetch('/api/orders/checkout', {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...tablePaymentHeaders(session?.token) }, body: JSON.stringify(fullPayload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to send order');
        toast.success("Order sent to kitchen!");
        clearCart();
        setActiveTab('history'); // Switch to history tab after ordering!
      } else {
        toast.error("Not supported in Dine-In mode");
      }
    } catch (error) {
      appToastError(translateLabel(error.message));
    } finally {
      setIsCheckingOut(false);
    }
  };


  const validPreorders = history.preorders.filter(item => item.item_status !== 'Cancelled');
  const validSessionOrders = history.sessionOrders.filter(item => item.item_status !== 'Cancelled');
  const historyItems = [...validPreorders, ...validSessionOrders];
  const activeOrder = history.sessionOrders[0] || history.preorders[0];
  const orderId = activeOrder?.order_id;
  const isReadyToPay = historyItems.length > 0;

  return (
    <>
      <button
        type="button"
        className={`menu-cart-drawer__backdrop${isDrawerOpen ? ' is-visible' : ''}`}
        aria-label={translateLabel("Close cart")}
        onClick={closeDrawer}
        tabIndex={isDrawerOpen ? 0 : -1}
      />

      <aside
        ref={panelRef}
        className={`menu-cart-drawer${isDrawerOpen ? ' menu-cart-drawer--open' : ''} flex flex-col`}
        aria-hidden={!isDrawerOpen}
        inert={!isDrawerOpen ? true : undefined}
        tabIndex={-1}
        style={{ padding: 0 }}
      >
        <header className="px-6 pt-6 pb-0 border-b border-gray-100 flex-shrink-0 relative">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
              {isDineInQr ? translateLabel("Your Session") : (language === 'vi' ? 'Giỏ hàng' : 'Your Cart')}
            </h2>
          </div>
          <div className="flex w-full">
            <button
              onClick={() => setActiveTab('cart')}
              className={`flex-1 pb-3 text-sm font-bold text-center border-b-2 transition-colors ${activeTab === 'cart' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-400 hover:text-gray-700'}`}
            >
              {translateLabel("Current Cart")} {items.length > 0 && <span className="ml-1 bg-emerald-100 text-emerald-700 py-0.5 px-2 rounded-full text-xs">{items.length}</span>}
            </button>
            {isDineInQr && (
              <button
                onClick={() => setActiveTab('history')}
                className={`flex-1 pb-3 text-sm font-bold text-center border-b-2 transition-colors flex items-center justify-center gap-1 ${activeTab === 'history' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-400 hover:text-gray-700'}`}
              >
                {translateLabel("Order History")} {historyItems.length > 0 && <span className="bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">{historyItems.length}</span>}
              </button>
            )}
          </div>
          <button
            type="button"
            className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
            onClick={closeDrawer}
            aria-label={translateLabel("Close panel")}
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50 relative">
          {activeTab === 'cart' ? (
            <div className="p-6 h-full flex flex-col">
              {items.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-2xl">🛒</div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{translateLabel("Cart is empty")}</h3>
                  <p className="text-gray-500 text-sm">{translateLabel("Add some delicious items from the menu!")}</p>
                </div>
              ) : (
                <ul className="space-y-4">
                  {items.map((item) => (
                    <li key={item.id} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex gap-3">
                      <div className="w-16 h-16 shrink-0">
                        {item.image || item.image_url ? (
                          <img src={resolveDishImage(item.image || item.image_url)} alt="" className="w-full h-full object-cover rounded-lg border border-gray-50" loading="lazy" />
                        ) : (
                          <div className="w-full h-full bg-gray-100 rounded-lg"></div>
                        )}

                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-800 truncate">{translateLabel(item.name)}</p>
                        <p className="text-sm font-bold text-emerald-600 mt-0.5">{formatVND(item.price)}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center bg-gray-100 rounded-full p-0.5">
                            <button
                              type="button"
                              className="w-6 h-6 flex items-center justify-center rounded-full bg-white shadow-sm text-gray-600 hover:text-emerald-600 font-bold"
                              onClick={() => setQuantity(item.id, item.quantity - 1)}
                            >−</button>
                            <span className="w-6 text-center text-xs font-bold text-gray-800">{item.quantity}</span>
                            <button
                              type="button"
                              className="w-6 h-6 flex items-center justify-center rounded-full bg-white shadow-sm text-gray-600 hover:text-emerald-600 font-bold"
                              onClick={() => setQuantity(item.id, item.quantity + 1)}
                            >+</button>
                          </div>
                          <button
                            type="button"
                            className="text-xs font-medium text-red-500 hover:text-red-600 hover:underline ml-auto"
                            onClick={() => removeItem(item.id)}
                          >
                            {translateLabel("Remove")}
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="p-6 h-full flex flex-col">
              {loadingHistory ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                  <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
                  <p>{translateLabel("Loading history...")}</p>
                </div>
              ) : historyError ? (
                <div className="py-8 text-center text-red-500 bg-red-50 rounded-xl border border-red-100">
                  <p>{historyError}</p>
                </div>
              ) : historyItems.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-2xl">🧾</div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{translateLabel("No Orders Yet")}</h3>
                  <p className="text-gray-500 text-sm">{translateLabel("Send your cart to kitchen first.")}</p>
                </div>
              ) : (
                <div className="space-y-6 pb-2">

                  {validPreorders.length > 0 && (
                    <section>
                      <div className="flex justify-between items-end mb-3">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{translateLabel("Pre-ordered")}</h3>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{translateLabel("Remaining 70%")}</span>
                      </div>
                      <div className="space-y-3">
                        {validPreorders.map((item) => (
                          <div key={item.order_item_id} className="bg-white rounded-xl p-3 flex gap-3 shadow-sm border border-gray-100 relative overflow-hidden group">
                              <div className="w-12 h-12 shrink-0">
                                <img src={resolveDishImage(item.image_url || item.image, item.dish_name || item.name)} alt="" className="w-full h-full object-cover rounded-md border border-gray-50" />
                              </div>


                            <div className="flex-1 min-w-0 pr-16">
                              <h4 className="font-semibold text-gray-800 text-sm truncate">{translateLabel(item.dish_name)}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs font-medium text-gray-500">x{item.quantity}</span>
                                <span className="text-gray-300">•</span>
                                <span className="text-xs font-bold text-gray-900">{formatVND(item.unit_price)}</span>
                              </div>
                            </div>
                            <div className="absolute bottom-2 right-2 flex gap-1">
                              <button 
                                onClick={() => {
                                  addItem({ id: item.dish_id, name: item.dish_name, price: item.unit_price, image: item.image_url });
                                  toast.success(`Added ${item.dish_name} to cart`);
                                }} 
                                className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center font-bold text-lg" title={translateLabel("Order More")}>
                                +
                              </button>
                              {(item.item_status === 'Pending' || item.item_status === 'Sent To Kitchen') && (
                                <button onClick={() => handleCancelItem(item.order_item_id)} className="w-7 h-7 rounded-full bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center font-bold" title={translateLabel("Cancel Item")}>✕</button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {validSessionOrders.length > 0 && (
                    <section>
                      <div className="flex justify-between items-end mb-3">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{translateLabel("Session Orders")}</h3>
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{translateLabel("Unpaid (100%)")}</span>
                      </div>
                      <div className="space-y-3">
                        {validSessionOrders.map((item) => {
                          const isExpanded = expandedItemId === item.order_item_id;
                          return (
                          <div key={item.order_item_id} 
                               className="bg-white rounded-xl p-3 flex flex-col gap-3 shadow-sm border border-gray-100 relative overflow-hidden group cursor-pointer transition-all"
                               onClick={() => setExpandedItemId(isExpanded ? null : item.order_item_id)}>
                            <div className="flex gap-3">
                              <div className="w-12 h-12 shrink-0">
                                <img src={resolveDishImage(item.image_url || item.image, item.dish_name || item.name)} alt="" className="w-full h-full object-cover rounded-md border border-gray-50" />
                              </div>


                              <div className="flex-1 min-w-0 pr-16">
                                <h4 className="font-semibold text-gray-800 text-sm truncate pr-2">{translateLabel(item.dish_name)}</h4>
                                <div className="flex items-center justify-between mt-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-gray-500">x{item.quantity}</span>
                                    <span className="text-gray-300">•</span>
                                    <span className="text-xs font-bold text-gray-900">{formatVND(item.unit_price)}</span>
                                  </div>
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${getStatusColor(item.item_status)}`}>
                                    {item.item_status.toUpperCase()}
                                  </span>
                                </div>
                              </div>
                              <div className="absolute bottom-2 right-2 flex gap-1">
                                {(item.item_status === 'Pending' || item.item_status === 'Sent To Kitchen') && !isExpanded && (
                                  <button onClick={(e) => { e.stopPropagation(); handleCancelItem(item.order_item_id); }} className="w-7 h-7 rounded-full bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center font-bold" title={translateLabel("Cancel Item")}>✕</button>
                                )}
                              </div>
                            </div>
                            
                            <AnimatePresence>
                              {isExpanded && (item.item_status === 'Pending' || item.item_status === 'Sent To Kitchen') && (
                                <motion.div 
                                  initial={{ height: 0, opacity: 0 }} 
                                  animate={{ height: 'auto', opacity: 1 }} 
                                  exit={{ height: 0, opacity: 0 }}
                                  className="border-t border-gray-50 pt-3 mt-1 flex items-center justify-between overflow-hidden"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="flex items-center bg-gray-100 rounded-full p-0.5">
                                    <button type="button" className="w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-sm text-gray-600 hover:text-emerald-600 font-bold text-lg" onClick={() => handleUpdateQuantity(item.order_item_id, item.quantity, -1)}>−</button>
                                    <span className="w-8 text-center text-sm font-bold text-gray-800">{item.quantity}</span>
                                    <button type="button" className="w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-sm text-gray-600 hover:text-emerald-600 font-bold text-lg" onClick={() => handleUpdateQuantity(item.order_item_id, item.quantity, 1)}>+</button>
                                  </div>
                                  <button onClick={() => handleCancelItem(item.order_item_id)} className="px-4 py-1.5 rounded-full bg-red-50 text-red-500 hover:bg-red-100 font-bold text-sm">{translateLabel("Cancel item")}</button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )})}
                      </div>
                    </section>
                  )}

                </div>
              )}
            </div>
          )}
        </div>

        <footer className="bg-white border-t border-gray-100 p-6 flex-shrink-0">
          {activeTab === 'cart' ? (
            <>
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-500 text-sm">{totalQuantity} {translateLabel("item")}{totalQuantity === 1 ? '' : 's'}</span>
                <span className="font-bold text-gray-900 text-lg">{formatVND(subtotal)}</span>
              </div>
              {isDineInQr ? (
                <button
                  type="button"
                  onClick={handleCheckoutCart}
                  disabled={isCheckingOut || items.length === 0}
                  className={`w-full py-3.5 rounded-xl font-bold text-base transition-all flex justify-center items-center gap-2 ${items.length === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-[#2f7d4f] text-white hover:bg-[#1f5a37] shadow-md'}`}
                >
                  {isCheckingOut ? 'Processing...' : (
                    <>
                      {translateLabel("Send Order to Kitchen")}
                    </>
                  )}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleReserveWithCart}
                    disabled={items.length === 0}
                    className={`w-full py-3.5 rounded-xl font-bold text-base transition-all flex justify-center items-center gap-2 ${items.length === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-[#2f7d4f] text-white hover:bg-[#1f5a37] shadow-md'}`}
                  >
                    {language === 'vi' ? 'Đặt bàn & thanh toán' : 'Reserve a table & pay'}
                  </button>
                  <p className="mt-3 text-xs text-gray-500 text-center">
                    {language === 'vi'
                      ? 'Món trong giỏ sẽ được đặt trước cho bàn của bạn.'
                      : 'Items in your cart will be pre-ordered for your table.'}
                  </p>
                </>
              )}
            </>
          ) : (
            <>
              {isReadyToPay && history.summary && (
                <>
                  <div className="space-y-1.5 mb-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">{translateLabel("Subtotal")}</span>
                      <span className="font-medium text-gray-900">{formatVND(history.summary.subtotal)}</span>
                    </div>
                    {Number(history.summary.serviceCharge) > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">{language === 'vi' ? 'Phí phục vụ' : 'Service charge'}</span>
                        <span>{formatVND(history.summary.serviceCharge)}</span>
                      </div>
                    )}
                    {Number(history.summary.discountAmount) > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">{language === 'vi' ? 'Giảm giá' : 'Discount'}</span>
                        <span>-{formatVND(history.summary.discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">{translateLabel("Prepaid Deposit")}</span>
                      <span className="font-bold text-emerald-600">-{formatVND(history.summary.prepaidDeposit)}</span>
                    </div>
                    <div className="h-px bg-gray-100 my-2"></div>
                    <div className="flex justify-between items-center text-base">
                      <span className="font-bold text-gray-900">{translateLabel("Remaining")}</span>
                      <span className="font-bold text-amber-600 text-lg">{formatVND(history.summary.remainingToPay)}</span>
                    </div>
                  </div>
                  {history.summary.remainingToPay > 0 && (
                    <button
                      onClick={async () => {
                        try {
                          await startOrderPayment(orderId, session?.token);
                          closeDrawer();
                          navigate(`/checkout/${orderId}`, { state: { amount: history.summary.remainingToPay } });
                        } catch (error) { appToastError(error.message); }
                        }}
                      className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center gap-2"
                    >
                      {translateLabel("Pay Now")}
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                  )}
                </>
              )}
            </>
          )}
        </footer>
      </aside>
    </>
  );
}

export default MenuCartDrawer;
