import { Route, Routes } from "react-router-dom"
import LandingPage from "../pages/landingPage"
import RoomPage from "../pages/roomPage"

const AppRouter = ()=> {
    return (
        <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/room/:roomId" element={<RoomPage />} />
</Routes>
    )
}

export default AppRouter