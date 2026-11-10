import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SyncProvider } from './context/SyncContext';
import { ThemeProvider } from './context/ThemeContext';
import { PwaProvider } from './context/PwaContext';
import { AppLayout } from './components/layout/AppLayout';

import { DashboardPage } from './pages/Dashboard/DashboardPage';
import { AllStudentsPage } from './pages/Students/AllStudentsPage';
import { StudentDetailPage } from './pages/Students/StudentDetailPage';
import { PassedStudentsPage } from './pages/Students/PassedStudentsPage';
import { FailedStudentsPage } from './pages/Students/FailedStudentsPage';
import { AbsentStudentsPage } from './pages/Students/AbsentStudentsPage';
import { SubjectsOverviewPage } from './pages/Subjects/SubjectsOverviewPage';
import { SubjectDetailPage } from './pages/Subjects/SubjectDetailPage';
import { CatAnalyticsPage } from './pages/CAT/CatAnalyticsPage';
import { AssessmentTrackingPage } from './pages/Assessment/AssessmentTrackingPage';
import { AssignmentTrackingPage } from './pages/Assignment/AssignmentTrackingPage';
import { ReportsPage } from './pages/Reports/ReportsPage';
import { ConnectionPage } from './pages/Connection/ConnectionPage';
import { SettingsPage } from './pages/Settings/SettingsPage';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <PwaProvider>
        <SyncProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<AppLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="students" element={<AllStudentsPage />} />
                <Route path="students/passed" element={<PassedStudentsPage />} />
                <Route path="students/failed" element={<FailedStudentsPage />} />
                <Route path="students/absent" element={<AbsentStudentsPage />} />
                <Route path="students/:id" element={<StudentDetailPage />} />
                <Route path="subjects" element={<SubjectsOverviewPage />} />
                <Route path="subjects/:id" element={<SubjectDetailPage />} />
                <Route path="cat/:catNum" element={<CatAnalyticsPage />} />
                <Route path="assessment" element={<AssessmentTrackingPage />} />
                <Route path="assignment" element={<AssignmentTrackingPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="connection" element={<ConnectionPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </SyncProvider>
      </PwaProvider>
    </ThemeProvider>
  );
};

export default App;

