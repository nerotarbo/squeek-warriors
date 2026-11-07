import { Routes, Route } from 'react-router'
import Game from './game/Game'
import BgmPlayer from './components/BgmPlayer'
import TouchControls from './components/TouchControls'
import SqueekHUD from './components/SqueekHUD'

export default function App() {
  return (
    <div className="w-screen h-screen overflow-hidden bg-black relative">
      <div className="relative z-10 w-full h-full">
        <Routes>
          <Route path="/" element={<Game />} />
        </Routes>
      </div>
      <SqueekHUD />
      <BgmPlayer />
      <TouchControls />
    </div>
  )
}
