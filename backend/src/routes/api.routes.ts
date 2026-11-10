import { Router } from 'express';
import {
  getHealth,
  getDashboard,
  getStudents,
  getStudentById,
  getPassedStudents,
  getFailedStudents,
  getAbsentStudents,
  getSubjects,
  getSubjectById,
  getCatAnalytics,
  getAssessmentIssues,
  getAssignmentIssues,
  getDataQuality,
  getSyncStatus,
  postSyncNow,
  getConnection,
  postConnection,
  deleteConnection,
  getSettings,
  updateSettings,
  getExcelReport,
  getPdfReport,
  getCsvTemplate
} from '../controllers/apiControllers.js';

const router = Router();

// Anti-caching headers: strictly ensure no browser or intermediate proxy caches student marks
router.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// Health
router.get('/health', getHealth);

// Dashboard
router.get('/dashboard', getDashboard);

// Students
router.get('/students', getStudents);
router.get('/students/passed', getPassedStudents);
router.get('/students/failed', getFailedStudents);
router.get('/students/absent', getAbsentStudents);
router.get('/students/:id', getStudentById);

// Subjects
router.get('/subjects', getSubjects);
router.get('/subjects/:id', getSubjectById);

// CAT Analytics: /api/cat/:catNum
router.get('/cat/:catNum', getCatAnalytics);

// Assessments & Assignments
router.get('/assessment/issues', getAssessmentIssues);
router.get('/assignment/issues', getAssignmentIssues);

// Data Quality
router.get('/data-quality', getDataQuality);

// Sync & Connection
router.get('/sync/status', getSyncStatus);
router.post('/sync/now', postSyncNow);
router.get('/connection', getConnection);
router.post('/connection', postConnection);
router.delete('/connection', deleteConnection);

// Academic & System Settings
router.get('/settings', getSettings);
router.post('/settings', updateSettings);

// Reports & Downloads
router.get('/reports/excel', getExcelReport);
router.get('/reports/pdf', getPdfReport);
router.get('/reports/template', getCsvTemplate);

export default router;

