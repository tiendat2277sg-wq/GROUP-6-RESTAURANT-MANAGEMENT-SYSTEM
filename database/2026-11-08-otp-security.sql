IF COL_LENGTH('dbo.OtpTokens','failed_attempts') IS NULL
  ALTER TABLE dbo.OtpTokens ADD failed_attempts INT NOT NULL DEFAULT 0;
IF COL_LENGTH('dbo.UserAccounts','session_version') IS NULL
  ALTER TABLE dbo.UserAccounts ADD session_version INT NOT NULL DEFAULT 0;
