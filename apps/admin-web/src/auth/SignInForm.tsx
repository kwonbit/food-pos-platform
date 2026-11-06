import { useState, type FormEvent } from "react";
import { LockKeyhole, Mail, Utensils } from "lucide-react";
import { useAuth } from "./AuthProvider";

export default function SignInForm() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const message = await signIn(email, password);
      if (message) setError(message);
    } catch {
      setError("로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <span className="auth-brand-mark"><Utensils size={22} /></span>
          <div><strong>food<span>pos</span></strong><small>STORE MANAGEMENT</small></div>
        </div>
        <div className="auth-heading">
          <p className="auth-eyebrow">ADMINISTRATOR ACCESS</p>
          <h1>관리자 로그인</h1>
          <p>등록된 관리자 계정으로 로그인해 주세요.</p>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="admin-email">이메일</label>
          <div className="auth-input-wrap"><Mail size={17} /><input id="admin-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@example.com" required /></div>
          <label htmlFor="admin-password">비밀번호</label>
          <div className="auth-input-wrap"><LockKeyhole size={17} /><input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="비밀번호 입력" required /></div>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? "로그인 중..." : "로그인"}</button>
        </form>
        <p className="auth-footnote">계정은 Supabase Authentication에서 사전에 등록해야 합니다.</p>
      </section>
    </main>
  );
}
