import { Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import AuthGuard from './guards/AuthGuard';
import RoleGuard from './guards/RoleGuard';
import AppLayout from './layouts/AppLayout';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import NotFoundPage from './pages/NotFoundPage';
import DashboardPage from './pages/DashboardPage';
import CoursesListPage from './pages/CoursesListPage';
import CourseDetailPage from './pages/CourseDetailPage';
import CourseManagementPage from './pages/CourseManagementPage';
import QuizTakePage from './pages/QuizTakePage';
import QuizResultPage from './pages/QuizResultPage';
import QuizDetailPage from './pages/QuizDetailPage';
import ChatPage from './pages/ChatPage';
import VarkPage from './pages/VarkPage';
import ProfilePage from './pages/ProfilePage';
import AdminPanelPage from './pages/AdminPanelPage';

import { useAuth } from './context/AuthContext';

function RootRoute() {
  const { user, status } = useAuth();
  if (status === 'pending') return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return <LandingPage />;
}

export default function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            fontFamily: 'var(--font-family-sans)',
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-md)',
            borderRadius: 'var(--radius-md)',
          },
        }}
      />
      <Routes>
        <Route path="/" element={<RootRoute />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route
          element={
            <AuthGuard>
              <AppLayout />
            </AuthGuard>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/courses" element={<CoursesListPage />} />
          <Route path="/courses/:id" element={<CourseDetailPage />} />
          <Route
            path="/courses/:id/manage"
            element={
              <RoleGuard roles={['teacher', 'admin']}>
                <CourseManagementPage />
              </RoleGuard>
            }
          />
          <Route path="/quizzes/:id" element={<QuizDetailPage />} />
          <Route
            path="/quizzes/:id/take"
            element={
              <RoleGuard roles={['student']}>
                <QuizTakePage />
              </RoleGuard>
            }
          />
          <Route
            path="/quizzes/:id/result/:attemptId"
            element={<QuizResultPage />}
          />
          <Route
            path="/chat"
            element={
              <RoleGuard roles={['student']}>
                <ChatPage />
              </RoleGuard>
            }
          />
          <Route
            path="/vark"
            element={
              <RoleGuard roles={['student']}>
                <VarkPage />
              </RoleGuard>
            }
          />
          <Route
            path="/profile"
            element={
              <RoleGuard roles={['student']}>
                <ProfilePage />
              </RoleGuard>
            }
          />
          <Route
            path="/admin"
            element={
              <RoleGuard roles={['admin']}>
                <AdminPanelPage />
              </RoleGuard>
            }
          />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
