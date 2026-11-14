import { useState } from 'react';
import { Routes, Route, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useLoad, useTitle } from '../hooks.js';
import { ADULT } from '../config.js';
import { ageGate } from '../local.js';
import AgeGate from '../components/AgeGate.jsx';
import Hero from '../components/Hero.jsx';
import Browse from './Browse.jsx';
import { TitleView } from './Title.jsx';
import NotFound from './NotFound.jsx';

function AdultHome() {
  useTitle('18+');
  const [params] = useSearchParams();
  const q = (params.get('q') || '').trim();
  const { data } = useLoad(() => api.home(true), []);

  return (
    <>
      {!q && data?.featured?.length > 0 && <Hero items={data.featured} />}
      <div className="page">
        <header className="page-head">
          <h1>{q ? `Results for “${q}”` : 'All 18+ titles'}</h1>
          {!q && <p className="muted">{ADULT.blurb}</p>}
        </header>
        <Browse category="adult" subs={ADULT.subs} adult q={q} />
      </div>
    </>
  );
}

function AdultTitle() {
  const { slug } = useParams();
  return <TitleView slug={slug} adult />;
}

export default function Adult() {
  const [ok, setOk] = useState(() => ageGate.ok());
  if (!ok) return <AgeGate onConfirm={() => { ageGate.confirm(); setOk(true); }} />;

  return (
    <Routes>
      <Route index element={<AdultHome />} />
      <Route path="title/:slug" element={<AdultTitle />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
