import test from 'node:test';
import assert from 'node:assert/strict';

for (const base of ['', '/pingyang']) {
  test(`browser API and stored media under ${base || 'root'}`, async () => {
    process.env.NEXT_PUBLIC_APP_BASE_PATH = base;
    const { browserPath, mediaUrl, mediaHtml } = await import(
      `../../frontend/site/src/lib/paths.ts?base=${encodeURIComponent(base)}`
    );
    assert.equal(browserPath('/api/v1/public/news?page=2'), `${base}/api/v1/public/news?page=2`);
    assert.equal(mediaUrl('/img/logo.jpg'), `${base}/img/logo.jpg`);
    assert.equal(mediaUrl('/uploads/photo.jpg'), `${base}/uploads/photo.jpg`);
    assert.equal(mediaUrl('http://localhost:18080/uploads/photo.jpg'), `${base}/uploads/photo.jpg`);
    assert.equal(mediaUrl('https://cdn.example.com/photo.jpg'), 'https://cdn.example.com/photo.jpg');
    assert.equal(mediaUrl(`${base}/uploads/photo.jpg`), `${base}/uploads/photo.jpg`);
    assert.equal(mediaHtml('<img src="/img/logo.jpg"><video poster="/uploads/poster.jpg">'),
      `<img src="${base}/img/logo.jpg"><video poster="${base}/uploads/poster.jpg">`);
    assert.equal(mediaHtml('<img src="https://cdn.example.com/photo.jpg">'),
      '<img src="https://cdn.example.com/photo.jpg">');
  });
}
