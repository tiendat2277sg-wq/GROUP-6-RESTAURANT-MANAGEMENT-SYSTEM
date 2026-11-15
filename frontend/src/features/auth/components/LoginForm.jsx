import { useLanguage } from '@/core/i18n/LanguageProvider.jsx';
import { PasswordInput, TextField, GoogleButton } from "./AuthFields";

function LoginForm({
  login,
  onLoginChange,
  onTouch,
  loginIdentifierError,
  loginPasswordError,
  onSubmit,
  onForgotPassword,
  onGoogleLogin,
  googleLoading,
  loginLoading,
}) {
  const { translateLabel, language } = useLanguage();
  const vi = language === "vi";
  return (
    <form className="auth-form auth-form--login" onSubmit={onSubmit} noValidate>
      <header className="auth-form__header">
        <p className="fuku-auth__eyebrow">{vi ? "Thành viên FUKU" : "FUKU Membership"}</p>
        <h2 className="fuku-auth__title">{vi ? <>Chào mừng<br /><em>trở lại</em></> : <>Welcome<br /><em>back</em></>}</h2>
        <p className="fuku-auth__intro">{vi ? "Đăng nhập để giữ chỗ tại quầy omakase và xem lại các lần đặt bàn của quý khách." : "Sign in to reserve your seat at the omakase counter and revisit your reservations."}</p>
      </header>

      <TextField
        id="login-identifier"
        placeholder="ten@email.com"
        label={translateLabel("Email or Username")}
        value={login.identifier}
        onChange={(e) => onLoginChange({ identifier: e.target.value })}
        onBlur={() => onTouch("loginIdentifier")}
        error={loginIdentifierError}
        autoComplete="username"
      />

      <PasswordInput
        id="login-password"
        placeholder="••••••••"
        labelAction={<button type="button" className="fuku-auth__forgot" onClick={onForgotPassword}>{translateLabel("Forgot password?")}</button>}
        label={translateLabel("Password")}
        value={login.password}
        onChange={(e) => onLoginChange({ password: e.target.value })}
        onBlur={() => onTouch("loginPassword")}
        error={loginPasswordError}
        autoComplete="current-password"
      />

      <div className="auth-form__row">
        <label className="auth-checkbox">
          <input
            type="checkbox"
            checked={login.rememberMe}
            onChange={(e) => onLoginChange({ rememberMe: e.target.checked })}
          />
          <span>{vi ? "Ghi nhớ đăng nhập trên thiết bị này" : "Remember me on this device"}</span>
        </label>
      </div>

      <button type="submit" className="auth-submit" disabled={loginLoading}>
        {translateLabel(loginLoading ? "SIGNING IN..." : "SIGN IN")}
      </button>

      <div className="fuku-auth__divider"><span>{vi ? "hoặc" : "or"}</span></div>
      <GoogleButton
        label={googleLoading ? "Connecting to Google..." : "Continue with Google"}
        onClick={onGoogleLogin}
        disabled={googleLoading}
      />
    </form>
  );
}

export default LoginForm;
