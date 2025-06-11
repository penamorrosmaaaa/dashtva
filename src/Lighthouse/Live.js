import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://amvikoumsiymrvgxlsog.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtdmlrb3Vtc2l5bXJ2Z3hsc29nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2MDE4NDYsImV4cCI6MjA2NTE3Nzg0Nn0.GsFEqjceDI36JOsHFr9-nQOSdQ-rlvM1VhoTC6DvLdE'
);

const websites = [
  "https://www.tvazteca.com/",
  "https://www.milenio.com/",
  "https://heraldodemexico.com.mx/",
  "https://www.eluniversal.com.mx/",
  "https://www.televisa.com/"
];

export default function WebsiteVitalsChecker() {
  const [loadingUrl, setLoadingUrl] = useState(null);
  const [results, setResults] = useState({});
  const [error, setError] = useState(null);

  const handleRetrieveMetrics = async (url) => {
    setLoadingUrl(url);
    setError(null);
    try {
      const { error } = await supabase
        .from('web_vitals_queue')  // ✅ tabla correcta
        .insert([{ url, status: 'pending' }]);

      if (error) throw error;
      console.log(`✅ Queued ${url}`);
    } catch (err) {
      setError(`Queue error: ${err.message}`);
    } finally {
      setLoadingUrl(null);
    }
  };

  const fetchMetrics = async (url) => {
    setError(null);
    try {
      const { data, error } = await supabase
        .from("web_vitals_results")  // ✅ tabla correcta
        .select("*")
        .eq("url", url)
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) throw error;

      const result = data?.[0];
      if (result) {
        setResults((prev) => ({ ...prev, [url]: result }));
      } else {
        setError("No results found.");
      }
    } catch (err) {
      setError(`Fetch error: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>🌐 Web Vitals Checker</h1>
      {websites.map((url) => (
        <div key={url} style={{ marginBottom: 15 }}>
          <button onClick={() => handleRetrieveMetrics(url)} disabled={loadingUrl === url}>
            {loadingUrl === url ? '⏳ Queuing...' : '🚀 Run Check'}
          </button>
          <button onClick={() => fetchMetrics(url)} style={{ marginLeft: 10 }}>
            🔄 Load Result
          </button>
          <div style={{ marginLeft: 10, fontSize: 14 }}>{url}</div>
          {results[url] && (
            <div style={{ marginLeft: 20, marginTop: 5, fontFamily: 'monospace' }}>
              <div>LCP: {results[url].lcp?.toFixed(2)} ms</div>
              <div>CLS: {results[url].cls}</div>
              <div>INP: {results[url].inp?.toFixed(2)} ms</div>
              <div>FCP: {results[url].fcp?.toFixed(2)} ms</div>
              <div>TTFB: {results[url].ttfb?.toFixed(2)} ms</div>
              <div>SI: {results[url].si?.toFixed(2)} ms</div>
              <div>TTI: {results[url].tti?.toFixed(2)} ms</div>
              <div>TBT: {results[url].tbt?.toFixed(2)} ms</div>
            </div>
          )}
        </div>
      ))}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
