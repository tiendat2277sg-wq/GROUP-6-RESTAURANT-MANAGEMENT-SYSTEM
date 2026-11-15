SET QUOTED_IDENTIFIER ON;
SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF OBJECT_ID(N'dbo.CustomerPaymentIntents', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.CustomerPaymentIntents (
    code varchar(32) NOT NULL PRIMARY KEY,
    customer_id int NOT NULL REFERENCES dbo.UserAccounts(user_id),
    reservation_id int NULL REFERENCES dbo.Reservations(reservation_id),
    amount decimal(12,2) NOT NULL CHECK(amount>0),
    transfer_ref nvarchar(120) NULL,
    gift_code varchar(40) NULL,
    edit_request_id bigint NULL,
    created_at datetime2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
  CREATE UNIQUE INDEX UX_CustomerPaymentIntents_transfer ON dbo.CustomerPaymentIntents(transfer_ref) WHERE transfer_ref IS NOT NULL;
END;
-- Remove previously logged employee passwords and require affected accounts to reset.
UPDATE u SET force_password_reset=1, session_version=session_version+1
FROM dbo.UserAccounts u JOIN dbo.StaffProfiles s ON s.user_id=u.user_id
WHERE EXISTS (SELECT 1 FROM dbo.AuditLogs a CROSS APPLY OPENJSON(CASE WHEN ISJSON(a.new_value_json)=1 THEN a.new_value_json ELSE '{}' END) j
  WHERE a.target_table='StaffProfiles' AND a.target_id=s.staff_id
  AND a.action_name IN ('EMPLOYEE_CREATED','EMPLOYEE_UPDATED') AND j.[key]='password' AND j.value<>'');

UPDATE a SET new_value_json=JSON_MODIFY(new_value_json,'$.password',NULL)
FROM dbo.AuditLogs a WHERE a.target_table='StaffProfiles' AND a.action_name IN ('EMPLOYEE_CREATED','EMPLOYEE_UPDATED')
AND EXISTS (SELECT 1 FROM OPENJSON(CASE WHEN ISJSON(a.new_value_json)=1 THEN a.new_value_json ELSE '{}' END) WHERE [key]='password');
COMMIT;
