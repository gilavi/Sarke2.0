import React, {useEffect} from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';
import useBaseUrl from '@docusaurus/useBaseUrl';

const SWAGGER_VERSION = '5.17.14';
const CSS_HREF = `https://unpkg.com/swagger-ui-dist@${SWAGGER_VERSION}/swagger-ui.css`;
const JS_SRC = `https://unpkg.com/swagger-ui-dist@${SWAGGER_VERSION}/swagger-ui-bundle.js`;

function ensureCss() {
  if (document.querySelector(`link[data-swagger-ui]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = CSS_HREF;
  link.setAttribute('data-swagger-ui', 'true');
  document.head.appendChild(link);
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(
      `script[data-swagger-ui]`,
    ) as HTMLScriptElement | null;
    if (existing) {
      if ((window as any).SwaggerUIBundle) return resolve();
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('load failed')));
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.setAttribute('data-swagger-ui', 'true');
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('load failed'));
    document.body.appendChild(s);
  });
}

function SwaggerInline({specUrl}: {specUrl: string}) {
  useEffect(() => {
    ensureCss();
    loadScript(JS_SRC).then(() => {
      const SwaggerUIBundle = (window as any).SwaggerUIBundle;
      if (SwaggerUIBundle && document.getElementById('swagger-ui-root')) {
        SwaggerUIBundle({
          url: specUrl,
          dom_id: '#swagger-ui-root',
          deepLinking: true,
          presets: [SwaggerUIBundle.presets.apis],
        });
      }
    });
  }, [specUrl]);
  return <div id="swagger-ui-root" />;
}

export default function SwaggerPage(): React.ReactElement {
  const specUrl = useBaseUrl('/openapi.json');
  return (
    <Layout
      title="Swagger UI"
      description="Auto-generated Supabase REST API for Sarke 2.0">
      <main style={{padding: '1rem'}}>
        <BrowserOnly fallback={<div>Loading Swagger UI…</div>}>
          {() => <SwaggerInline specUrl={specUrl} />}
        </BrowserOnly>
      </main>
    </Layout>
  );
}
