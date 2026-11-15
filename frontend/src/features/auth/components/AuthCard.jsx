import { useLanguage } from '@/core/i18n/LanguageProvider.jsx';
import { useState } from "react";
import {
  isEmailValue,
  isValidEmail,
  isValidVietnamPhone,
  isPasswordStrong,
  isAtLeast13YearsOld,
  isDateOfBirthNotInFuture,
  parseDateOfBirth,
  validateUsername,
  validateFullName,
  splitFullName,
  normalizePhone,
  blurActiveElement,
} from "../utils/authHelpers.js";
import { loginAccount, registerAccount, resendVerificationCode } from "../services/authApi.js";
import { buildInitialTiming } from "../utils/otpTiming.js";
import { signInWithGoogle, registerWithGoogle } from "./googleAuth";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";
import "@/features/auth/styles/auth.css";

const EMPTY_SIGNUP = {
  fullName: "",
  username: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  password: "",
  confirmPassword: "",
  agreeTerms: false,
};

function AuthCard({
  onProceedToOtp,
  onAuthSuccess,
  onForgotPassword,
  initialMode = "login",
  successMessage = "",
  onClearSuccess,
}) {
  const { translateLabel, language } = useLanguage();
  const vi = language === "vi";
  const normalizeMode = (value) => (value === "signup" || value === "register" ? "register" : "login");
  const [authMode, setAuthMode] = useState(() => normalizeMode(initialMode));
  const [alert, setAlert] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState({});
  const [login, setLogin] = useState({ identifier: "", password: "", rememberMe: false });
  const [signup, setSignup] = useState(EMPTY_SIGNUP);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [apiFieldErrors, setApiFieldErrors] = useState({});
  const [unverifiedUser, setUnverifiedUser] = useState(null);

  const touch = (field) => setTouched((prev) => ({ ...prev, [field]: true }));
  const shouldShow = (field) => submitted || touched[field];

  const validateLoginIdentifier = (value) => {
    const trimmed = value.trim();
    if (!trimmed) return "Email or username is required.";
    if (isEmailValue(trimmed) && !isValidEmail(trimmed)) {
      return "Enter a valid email address.";
    }
    return "";
  };

  const validateLoginPassword = (value) => {
    if (!value) return "Password is required.";
    return "";
  };

  const getSignupErrors = () => ({
    fullName:
      apiFieldErrors.firstName ||
      apiFieldErrors.lastName ||
      (shouldShow("fullName") ? validateFullName(signup.fullName) : ""),
    username:
      apiFieldErrors.username ||
      (shouldShow("username") ? validateUsername(signup.username) : ""),
    email:
      apiFieldErrors.email ||
      (shouldShow("email")
        ? !signup.email.trim()
          ? "Email is required."
          : !isValidEmail(signup.email)
          ? "Enter a valid email address."
          : ""
        : ""),
    phone:
      apiFieldErrors.phoneNumber ||
      apiFieldErrors.phone ||
      (shouldShow("phone")
        ? !signup.phone.trim()
          ? "Phone number is required."
          : !/^\d+$/.test(normalizePhone(signup.phone))
          ? "Phone must contain digits only."
          : !isValidVietnamPhone(signup.phone)
          ? "Phone number must be 10–11 digits."
          : ""
        : ""),
    dateOfBirth:
      apiFieldErrors.dateOfBirth ||
      (shouldShow("dateOfBirth")
        ? !signup.dateOfBirth
          ? "Date of birth is required."
          : !parseDateOfBirth(signup.dateOfBirth)
          ? "Enter a valid date of birth."
          : !isDateOfBirthNotInFuture(signup.dateOfBirth)
          ? "Date of birth cannot be in the future."
          : !isAtLeast13YearsOld(signup.dateOfBirth)
          ? "You must be at least 13 years old."
          : ""
        : ""),
    password:
      apiFieldErrors.password ||
      (shouldShow("password")
        ? !signup.password
          ? "Password is required."
          : !isPasswordStrong(signup.password)
          ? "Password must meet security requirements."
          : ""
        : ""),
    confirmPassword:
      apiFieldErrors.confirmPassword ||
      (shouldShow("confirmPassword")
        ? !signup.confirmPassword
          ? "Confirm password is required."
          : signup.confirmPassword !== signup.password
          ? "Passwords do not match."
          : ""
        : ""),
    terms:
      shouldShow("terms") && !signup.agreeTerms
        ? "You must accept the Terms of Service and Privacy Policy."
        : "",
  });

  const loginIdentifierError = shouldShow("loginIdentifier")
    ? validateLoginIdentifier(login.identifier)
    : "";
  const loginPasswordError = shouldShow("loginPassword")
    ? validateLoginPassword(login.password)
    : "";
  const signupErrors = getSignupErrors();

  const switchMode = (nextMode) => {
    blurActiveElement();

    const mode = normalizeMode(nextMode);
    setAuthMode(mode);
    setAlert(null);
    setSubmitted(false);
    setTouched({});
    setUnverifiedUser(null);
    setApiFieldErrors({});
    onClearSuccess?.();
    if (mode === "register") setSignup(EMPTY_SIGNUP);
  };

  const handleGoogleLogin = async () => {
    setAlert(null);

    try {
      setGoogleLoading(true);
      const result = await signInWithGoogle();
      if (
        result.type === "register" ||
        result.type === "otp" ||
        result.requiresOtp
      ) {
        onProceedToOtp?.({
          challenge: result.challenge, purpose: result.purpose,
          userId: result.userId,
          email: result.email,
          verificationMode: "email",
          initialTiming: buildInitialTiming(result),
        });
      } else {
        onAuthSuccess?.(result.user, { remember: login.rememberMe, showWelcome: true });
      }
    } catch (error) {
      if (error.code === "EMAIL_NOT_VERIFIED" && error.data) {
        onProceedToOtp?.({
          userId: error.data.userId,
          email: error.data.email,
          verificationMode: "email",
        });
        return;
      }
      

      setAlert({
        type: "error",
        message: error?.message || "Google login failed. Please try again.",
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setAlert(null);

    try {
      setGoogleLoading(true);
      const data = await registerWithGoogle();
      if (data.token && data.user) {
        onAuthSuccess?.(data.user, { remember: login.rememberMe, showWelcome: true });
        return;
      }
      onProceedToOtp?.({
        challenge: data.challenge, purpose: data.purpose,
        userId: data.userId,
        email: data.email,
        verificationMode: "email",
        initialTiming: buildInitialTiming(data),
      });
    } catch (error) {

      setAlert({
        type: "error",
        message: error?.message || "Google registration failed. Please try again.",
      });
    } finally {
      setGoogleLoading(false);
    }
  };


  const handleResendVerification = async () => {
    const target = unverifiedUser;
    if (!target?.email) return;
    try {
      const data = await resendVerificationCode({
        email: target.email,
        purpose: "EMAIL_VERIFY",
      });
      onProceedToOtp?.({
        userId: target.userId,
        email: target.email,
        verificationMode: "email",
        initialTiming: buildInitialTiming(data),
      });
    } catch (err) {
      setAlert({ type: "error", message: err.message || "Resend failed." });
    }
  };

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    setSubmitted(true);
    setAlert(null);
    setUnverifiedUser(null);
    const identifierError = validateLoginIdentifier(login.identifier);
    const passwordError = validateLoginPassword(login.password);
    if (identifierError || passwordError) return;

    try {
      setLoginLoading(true);
      const data = await loginAccount({
        identifier: login.identifier.trim(),
        password: login.password,
      });
      if (data.requiresOtp) { onProceedToOtp?.({...data,initialTiming:buildInitialTiming(data)}); return; }
      onAuthSuccess?.(data.user, { remember: login.rememberMe, showWelcome: true });
    } catch (error) {
      if (error.code === "EMAIL_NOT_VERIFIED") {
        setUnverifiedUser({
          userId: error.data?.userId,
          email: error.data?.email,
        });
        setAlert({
          type: "error",
          message: "Please verify your email before logging in.",
        });
        return;
      }

      setUnverifiedUser(null);
      setAlert({
        type: "error",
        message: error?.message || "Login failed. Please try again.",
      });
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignupSubmit = async (event) => {
    event.preventDefault();
    setSubmitted(true);
    setAlert(null);
    setApiFieldErrors({});

    const errors = {
      fullName: validateFullName(signup.fullName),
      username: validateUsername(signup.username),
      email: !signup.email.trim()
        ? "Email is required."
        : !isValidEmail(signup.email)
        ? "Enter a valid email address."
        : "",
      phone: !signup.phone.trim()
        ? "Phone number is required."
        : !/^\d+$/.test(normalizePhone(signup.phone))
        ? "Phone must contain digits only."
        : !isValidVietnamPhone(signup.phone)
        ? "Phone number must be 10–11 digits."
        : "",
      dateOfBirth: !signup.dateOfBirth
        ? "Date of birth is required."
        : !parseDateOfBirth(signup.dateOfBirth)
        ? "Enter a valid date of birth."
        : !isDateOfBirthNotInFuture(signup.dateOfBirth)
        ? "Date of birth cannot be in the future."
        : !isAtLeast13YearsOld(signup.dateOfBirth)
        ? "You must be at least 13 years old."
        : "",
      password: !signup.password
        ? "Password is required."
        : !isPasswordStrong(signup.password)
        ? "Password must meet security requirements."
        : "",
      confirmPassword: !signup.confirmPassword
        ? "Confirm password is required."
        : signup.confirmPassword !== signup.password
        ? "Passwords do not match."
        : "",
      terms: !signup.agreeTerms
        ? "You must accept the Terms of Service and Privacy Policy."
        : "",
    };

    if (Object.values(errors).some(Boolean)) return;

    const { firstName, lastName } = splitFullName(signup.fullName);
    const payload = {
      firstName,
      lastName,
      username: signup.username.trim().toLowerCase(),
      email: signup.email.trim().toLowerCase(),
      phoneNumber: normalizePhone(signup.phone),
      dateOfBirth: signup.dateOfBirth,
      password: signup.password,
      confirmPassword: signup.confirmPassword,
    };

    try {
      setSignupLoading(true);
      const data = await registerAccount(payload);

      onProceedToOtp?.({
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email,
        challenge: data.challenge, purpose: data.purpose,
        userId: data.userId,
        verificationMode: "email",
        initialTiming: buildInitialTiming(data),
      });
    } catch (error) {
      if (error.data?.errors && typeof error.data.errors === "object") {
        const mapped = { ...error.data.errors };
        if (mapped.phoneNumber) mapped.phone = mapped.phoneNumber;
        setApiFieldErrors(mapped);
      } else if (error.data?.field) {
        const field = error.data.field === "phoneNumber" ? "phone" : error.data.field;
        setApiFieldErrors({ [field]: error.data.message || error.message });
      }

      setAlert({
        type: "error",
        message: error?.message || "Registration failed.",
      });
    } finally {
      setSignupLoading(false);
    }
  };

  const handleSignupChange = (field, value) => {
    setSignup((prev) => ({ ...prev, [field]: value }));
  };

  const isRegister = authMode === "register";

  return (
    <div className={`fuku-auth ${isRegister ? "fuku-auth--register" : "fuku-auth--login"}`}>
      <section className="fuku-auth__main">
        {successMessage && <div className="auth-alert auth-alert--success" role="status">{translateLabel(successMessage)}</div>}
        {alert && <div className={`auth-alert auth-alert--${alert.type}`} role="alert">
          {translateLabel(alert.message)}
          {unverifiedUser && <button type="button" className="auth-form__link" onClick={handleResendVerification}>{translateLabel("Resend verification code")}</button>}
        </div>}
        {isRegister ? <RegisterForm
          signup={signup} onSignupChange={handleSignupChange} onTouch={touch}
          signupErrors={signupErrors} onSubmit={handleSignupSubmit}
          onGoogleRegister={handleGoogleRegister} googleLoading={googleLoading} signupLoading={signupLoading}
        /> : <LoginForm
          login={login} onLoginChange={(patch) => setLogin((prev) => ({ ...prev, ...patch }))}
          onTouch={touch} loginIdentifierError={loginIdentifierError} loginPasswordError={loginPasswordError}
          onSubmit={handleLoginSubmit} onForgotPassword={onForgotPassword}
          onGoogleLogin={handleGoogleLogin} googleLoading={googleLoading} loginLoading={loginLoading}
        />}
        <p className="fuku-auth__switch">
          {isRegister ? (vi ? "Đã có tài khoản? " : "Already a member? ") : (vi ? "Chưa có tài khoản? " : "Don't have an account? ")}
          <button type="button" onClick={() => switchMode(isRegister ? "login" : "register")}>
            {isRegister ? (vi ? "Đăng nhập" : "Sign in") : (vi ? "Đăng ký thành viên" : "Become a member")}
          </button>
        </p>
      </section>
      <aside className="fuku-auth__brand-panel">
        <span className="fuku-auth__wordmark">FUKU</span>
        <div key={authMode} className="fuku-auth__brand-content">
          <span className="fuku-auth__kanji" lang="ja" aria-hidden="true">福</span>
          <span className="fuku-auth__ornament" aria-hidden="true">◆</span>
          <h2>{isRegister ? (vi ? "Đã là thành viên?" : "Already a member?") : (vi ? "Xin chào quý khách" : "Welcome to FUKU")}</h2>
          <p>{isRegister
            ? (vi ? "Đăng nhập để tiếp tục đặt bàn và thưởng thức ẩm thực tại FUKU." : "Sign in to reserve your table and enjoy the FUKU experience.")
            : (vi ? "Trở thành thành viên để đặt chỗ trước, nhận ưu đãi theo mùa và quyền lợi dành riêng cho khách quen." : "Become a member for reservations, seasonal offers and exclusive privileges.")}</p>
          <button type="button" onClick={() => switchMode(isRegister ? "login" : "register")}>
            {isRegister ? (vi ? "Đăng nhập" : "Sign in") : (vi ? "Đăng ký thành viên" : "Become a member")}
          </button>
        </div>
        <span className="fuku-auth__tagline">{vi ? "Omakase Nhật Bản" : "Japanese Omakase"}</span>
      </aside>
    </div>
  );
}

export default AuthCard;
