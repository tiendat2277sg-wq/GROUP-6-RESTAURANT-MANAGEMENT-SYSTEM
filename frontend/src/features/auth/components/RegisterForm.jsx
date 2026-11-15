import { useLanguage } from '@/core/i18n/LanguageProvider.jsx';
import { PasswordInput, TextField, StrengthMeter, GoogleButton } from "./AuthFields";

function RegisterForm({
  signup,
  onSignupChange,
  onTouch,
  signupErrors,
  onSubmit,
  onGoogleRegister,
  googleLoading,
  signupLoading,
}) {
  const { translateLabel, language } = useLanguage();
  const vi = language === "vi";
  const updateSignup = (field) => (event) => {
    const { value, type, checked } = event.target;
    onSignupChange(field, type === "checkbox" ? checked : value);
  };

  return (
    <form className="auth-form auth-form--register auth-form--signup" onSubmit={onSubmit} noValidate>
      <header className="auth-form__header">
        <p className="fuku-auth__eyebrow">{vi ? "Thành viên FUKU" : "FUKU Membership"}</p>
        <h2 className="fuku-auth__title">{vi ? <>Tạo <em>tài khoản</em></> : <>Create <em>an account</em></>}</h2>
      </header>
      <div className="auth-form__grid auth-form__grid--2">
      <TextField
        id="signup-fullname"
        placeholder="Nguyễn Văn A"
        label={translateLabel("Full Name")}
        value={signup.fullName}
        onChange={updateSignup("fullName")}
        onBlur={() => onTouch("fullName")}
        error={signupErrors.fullName}
        autoComplete="name"
        className="auth-form__full"
      />
      <TextField
        id="signup-username"
        placeholder="nguyenvana"
        label={translateLabel("Username")}
        value={signup.username}
        onChange={updateSignup("username")}
        onBlur={() => onTouch("username")}
        error={signupErrors.username}
        autoComplete="username"
        className="auth-form__full"
      />

      </div>
      <div className="auth-form__grid auth-form__grid--2">
        <TextField
          id="signup-email"
        placeholder="ten@email.com"
          label={translateLabel("Email")}
          type="email"
          value={signup.email}
          onChange={updateSignup("email")}
          onBlur={() => onTouch("email")}
          error={signupErrors.email}
          autoComplete="email"
        />
        <TextField
          id="signup-phone"
        placeholder="09xx xxx xxx"
          label={translateLabel("Phone Number")}
          type="tel"
          value={signup.phone}
          onChange={updateSignup("phone")}
          onBlur={() => onTouch("phone")}
          error={signupErrors.phone}
          autoComplete="tel"
        />
      </div>

      <div className="auth-form__grid auth-form__grid--2">
      <TextField
        id="signup-dob"
        label={translateLabel("Date of Birth")}
        type="date"
        value={signup.dateOfBirth}
        onChange={updateSignup("dateOfBirth")}
        onBlur={() => onTouch("dateOfBirth")}
        error={signupErrors.dateOfBirth}
        className="auth-form__full"
      />

      <p className="fuku-auth__birthday-note">{vi ? "Để FUKU gửi lời chúc và món quà nhỏ vào dịp sinh nhật quý khách." : "So FUKU can send you birthday wishes and a little gift on your special day."}</p>
      </div>
      <div className="auth-form__grid auth-form__grid--2">
        <div className="auth-form__password-col">
          <PasswordInput
            id="signup-password"
            placeholder={vi ? "Tối thiểu 8 ký tự" : "At least 8 characters"}
            label={translateLabel("Password")}
            value={signup.password}
            onChange={updateSignup("password")}
            onBlur={() => onTouch("password")}
            error={signupErrors.password}
            autoComplete="new-password"
          />
          <StrengthMeter password={signup.password} />
        </div>
        <PasswordInput
          id="signup-confirm"
          placeholder={vi ? "Nhập lại mật khẩu" : "Repeat your password"}
          label={translateLabel("Confirm Password")}
          value={signup.confirmPassword}
          onChange={updateSignup("confirmPassword")}
          onBlur={() => onTouch("confirmPassword")}
          error={signupErrors.confirmPassword}
          autoComplete="new-password"
        />
      </div>

      <label className="auth-checkbox auth-checkbox--terms auth-form__full">
        <input
          type="checkbox"
          checked={signup.agreeTerms}
          onChange={updateSignup("agreeTerms")}
          onBlur={() => onTouch("terms")}
        />
        <span>{translateLabel("I agree to the Terms of Service and Privacy Policy.")}</span>
      </label>
      {signupErrors.terms ? (
        <p className="auth-field__error auth-field__error--terms auth-form__full">
          {translateLabel(signupErrors.terms)}
        </p>
      ) : null}

      <div className="fuku-auth__register-actions">
      <button type="submit" className="auth-submit auth-form__full" disabled={signupLoading}>
        {signupLoading ? translateLabel("SIGNING UP...") : (vi ? "Tạo tài khoản" : "Create account")}
      </button>

      <GoogleButton
        label={googleLoading ? "Connecting to Google..." : (vi ? "Đăng ký với Google" : "Sign up with Google")}
        onClick={onGoogleRegister}
        disabled={googleLoading}
      />
      </div>
    </form>
  );
}

export default RegisterForm;
