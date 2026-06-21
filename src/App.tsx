import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import CatalogPage from './pages/CatalogPage'
import AnimeDetail from './pages/AnimeDetail'
import TierListPage from './pages/TierListPage'
import BrowseAllPage from './pages/BrowseAllPage'
import UpcomingAllPage from './pages/UpcomingAllPage'
import MyListPage from './pages/MyListPage'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-bg text-text-base font-body">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/anime/:id" element={<AnimeDetail />} />
          <Route path="/tierlist" element={<TierListPage />} />
          <Route path="/browse" element={<BrowseAllPage />} />
          <Route path="/upcoming" element={<UpcomingAllPage />} />
          <Route path="/mylist" element={<MyListPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
