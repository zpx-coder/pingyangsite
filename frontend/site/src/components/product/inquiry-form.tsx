'use client';

// 产品询盘表单（PRD §6.4）：姓名/公司/国家/邮箱/电话/内容 + 图形验证码（点击刷新），
// 客户端校验按当前语言提示，提交失败显示后端消息并刷新验证码，成功后弹窗可继续浏览。
import { useEffect, useState, type FormEvent } from 'react';
import { COUNTRIES, COMMON_COUNTRIES } from '@/lib/countries';
import { dict, type Lang } from '@/lib/i18n';
import { browserPath } from '@/lib/paths';

const REQUEST_TIMEOUT_MS = 15_000;
const PHONE_RE = /^[0-9+\-\s]{6,20}$/;
const EMAIL_RE = /^\S+@\S+\.\S+$/;

interface FieldErrors {
  name?: string;
  companyName?: string;
  country?: string;
  email?: string;
  phone?: string;
  content?: string;
  captcha?: string;
}

export default function InquiryForm({
  lang,
  productId,
  nameZh,
  nameEn,
}: {
  lang: Lang;
  productId: number;
  nameZh: string;
  nameEn: string;
}) {
  const t = dict[lang].product;
  const isEn = lang === 'en';

  // 预填询盘内容模板（PRD §6.4，可修改）
  const contentTemplate = isEn
    ? `I'm interested in "${nameEn}". Please provide a quote and MOQ.`
    : `我对贵司的「${nameZh}」感兴趣，请提供报价与 MOQ。`;

  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [country, setCountry] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [content, setContent] = useState(contentTemplate);
  const [captchaId, setCaptchaId] = useState('');
  const [captchaSvg, setCaptchaSvg] = useState('');
  const [captchaCode, setCaptchaCode] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const refreshCaptcha = async () => {
    try {
      const res = await fetch(browserPath('/api/v1/public/captcha'), { cache: 'no-store' });
      const body = (await res.json()) as { code: number; message: string; data: { captchaId: string; svg: string } };
      if (body.code !== 0) {
        throw new Error(body.message);
      }
      setCaptchaId(body.data.captchaId);
      setCaptchaSvg(body.data.svg);
      setCaptchaCode('');
    } catch {
      // 验证码加载失败时留空并允许点击重试，不阻塞表单
      setCaptchaId('');
      setCaptchaSvg('');
    }
  };

  // 组件挂载即取验证码；语言切换由 SSR 整页重渲染，模板与文案随之更新
  useEffect(() => {
    refreshCaptcha();
  }, []);

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    const nameTrim = name.trim();
    if (!nameTrim) next.name = t.errRequired;
    else if (nameTrim.length < 2 || nameTrim.length > 50) next.name = t.errName;
    if (companyName.trim().length > 100) next.companyName = t.errCompany;
    if (!country) next.country = t.errRequired;
    if (!email.trim()) next.email = t.errRequired;
    else if (!EMAIL_RE.test(email.trim())) next.email = t.errEmail;
    if (!phone.trim()) next.phone = t.errRequired;
    else if (!PHONE_RE.test(phone.trim())) next.phone = t.errPhone;
    if (content.trim().length < 10 || content.trim().length > 2000) next.content = t.errContent;
    if (captchaCode.trim().length !== 4) next.captcha = t.errCaptcha;
    return next;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next = validate();
    setErrors(next);
    setServerError('');
    if (Object.keys(next).length > 0) {
      return;
    }
    setSubmitting(true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(browserPath('/api/v1/public/inquiries'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          companyName: companyName.trim() || undefined,
          country,
          email: email.trim(),
          phone: phone.trim(),
          content: content.trim(),
          productId,
          lang,
          captchaId,
          captchaCode: captchaCode.trim(),
        }),
        signal: controller.signal,
      });
      const body = (await res.json()) as { code: number; message: string };
      if (body.code === 0) {
        setSubmitted(true);
        // 成功后重置表单，验证码换新
        setName('');
        setCompanyName('');
        setCountry('');
        setEmail('');
        setPhone('');
        setContent(contentTemplate);
        refreshCaptcha();
      } else {
        // 业务失败（含验证码错误/限流）：显示后端消息并刷新验证码（PRD：验证失败刷新）
        setServerError(body.message || 'error');
        refreshCaptcha();
      }
    } catch {
      setServerError(t.loadError); // 网络异常兜底提示（不泄漏细节）
    } finally {
      clearTimeout(timer);
      setSubmitting(false);
    }
  };

  const countryLabel = (c: (typeof COUNTRIES)[number]) => (isEn ? c.en : c.zh);

  return (
    <>
      <div className="form-card">
        <form onSubmit={submit} noValidate>
          <div className="form-row2">
            <div className="fg">
              <label htmlFor="inq-name">
                {t.fName} <i>*</i>
              </label>
              <input id="inq-name" value={name} placeholder={t.fNamePh} onChange={(e) => setName(e.target.value)} />
              {errors.name && <span className="ferr">{errors.name}</span>}
            </div>
            <div className="fg">
              <label htmlFor="inq-email">
                {t.fEmail} <i>*</i>
              </label>
              <input id="inq-email" value={email} placeholder={t.fEmailPh} onChange={(e) => setEmail(e.target.value)} />
              {errors.email && <span className="ferr">{errors.email}</span>}
            </div>
            <div className="fg">
              <label htmlFor="inq-phone">{t.fPhone}</label>
              <input id="inq-phone" value={phone} placeholder={t.fPhonePh} onChange={(e) => setPhone(e.target.value)} />
              {errors.phone && <span className="ferr">{errors.phone}</span>}
            </div>
            <div className="fg">
              <label htmlFor="inq-country">
                {t.fCountry} <i>*</i>
              </label>
              <select id="inq-country" value={country} onChange={(e) => setCountry(e.target.value)}>
                <option value="">{t.fCountryPh}</option>
                <optgroup label={isEn ? 'Common' : '常用'}>
                  {COMMON_COUNTRIES.map((c) => (
                    <option key={c.en} value={isEn ? c.en : c.zh}>
                      {countryLabel(c)}
                    </option>
                  ))}
                </optgroup>
                <optgroup label={isEn ? 'All' : '全部'}>
                  {COUNTRIES.slice(COMMON_COUNTRIES.length).map((c) => (
                    <option key={c.en} value={isEn ? c.en : c.zh}>
                      {countryLabel(c)}
                    </option>
                  ))}
                </optgroup>
              </select>
              {errors.country && <span className="ferr">{errors.country}</span>}
            </div>
          </div>
          <div className="fg">
            <label htmlFor="inq-company">{t.fCompany}</label>
            <input id="inq-company" value={companyName} placeholder={t.fCompanyPh} onChange={(e) => setCompanyName(e.target.value)} />
            {errors.companyName && <span className="ferr">{errors.companyName}</span>}
          </div>
          <div className="fg">
            <label htmlFor="inq-content">
              {t.fContent} <i>*</i>
            </label>
            <textarea id="inq-content" rows={4} value={content} placeholder={t.fContentPh} onChange={(e) => setContent(e.target.value)} />
            {errors.content && <span className="ferr">{errors.content}</span>}
          </div>
          <div className="form-row2">
            <div className="fg captcha-row">
              <div>
                <label>
                  {t.fCaptcha} <i>*</i>
                </label>
                {/* 验证码为后端生成的受信 SVG，点击更换（PRD：验证失败刷新） */}
                <div
                  className="captcha-box"
                  role="button"
                  tabIndex={0}
                  title={t.captchaRefresh}
                  onClick={refreshCaptcha}
                  onKeyDown={(e) => e.key === 'Enter' && refreshCaptcha()}
                  dangerouslySetInnerHTML={{ __html: captchaSvg }}
                />
                <span className="ferr">{errors.captcha}</span>
              </div>
              <div style={{ flex: 1 }}>
                <label htmlFor="inq-captcha">&nbsp;</label>
                <input id="inq-captcha" value={captchaCode} maxLength={4} placeholder={t.fCaptchaPh} onChange={(e) => setCaptchaCode(e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-gold" disabled={submitting}>
                {submitting ? t.submitting : t.submitBtn}
              </button>
            </div>
          </div>
          {serverError && <div className="form-serr">{serverError}</div>}
        </form>
      </div>

      {submitted && (
        <div className="modal-mask" role="dialog" aria-modal="true">
          <div className="modal-card">
            <div className="modal-ico">✓</div>
            <h3>{t.successTitle}</h3>
            <p>{t.successBody}</p>
            <button type="button" className="btn btn-gold" onClick={() => setSubmitted(false)}>
              {t.successClose}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
