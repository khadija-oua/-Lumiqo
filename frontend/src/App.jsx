import { Routes, Route } from 'react-router-dom';

function Home() {
  return (
    <main className="welcome">
      <h1>SmartMoodle — Bienvenue</h1>
      <p>Bienvenue sur SmartMoodle, votre plateforme d'apprentissage adaptatif.</p>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
    </Routes>
  );
}
