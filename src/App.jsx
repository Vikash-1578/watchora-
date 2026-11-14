import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
import Category from './pages/Category.jsx';
import Title from './pages/Title.jsx';
import Search from './pages/Search.jsx';
import MyList from './pages/MyList.jsx';
import Adult from './pages/Adult.jsx';
import Admin from './pages/Admin.jsx';
import { About, Privacy, Dmca, Contact } from './pages/Info.jsx';
import NotFound from './pages/NotFound.jsx';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export default function App() {
  const { pathname } = useLocation();
  const adult = pathname.startsWith('/18plus');
  const isAdmin = pathname.startsWith('/admin');

  return (
    <div className={`app ${adult ? 'is-adult' : ''}`}>
      <ScrollToTop />
      <a className="skip" href="#main">Skip to content</a>
      {!isAdmin && <Header adult={adult} />}
      <main id="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/c/:cat" element={<Category />} />
          <Route path="/title/:slug" element={<Title />} />
          <Route path="/search" element={<Search />} />
          <Route path="/my-list" element={<MyList />} />
          <Route path="/18plus/*" element={<Adult />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/about" element={<About />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/dmca" element={<Dmca />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!isAdmin && <Footer adult={adult} />}
    </div>
  );
}
