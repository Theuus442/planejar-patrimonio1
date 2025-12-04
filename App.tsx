import React, { useState, useEffect, useCallback } from 'react';
import { User, Project, UserRole } from './types';

// Supabase Services
import supabaseAuthService from './services/supabaseAuth';
import { usersDB, projectsDB, projectClientsDB, tasksDB, chatDB, activityLogsDB, phaseDataDB, assetsDB } from './services/supabaseDatabase';

// Component Imports
import LoginScreen from './components/LoginScreen';
import ChangePasswordScreen from './components/ChangePasswordScreen';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ConsultantDashboard from './components/ConsultantDashboard';
import AuxiliaryDashboard from './components/AuxiliaryDashboard';
import ProjectDetailView from './components/ProjectDetailView';
import CreateClientScreen from './components/CreateClientScreen';
import ManageUsersScreen from './components/ManageUsersScreen';
import MyDataScreen from './components/MyDataScreen';
import MyTasksScreen from './components/MyTasksScreen';
import ProjectChat from './components/ProjectChat';
import DocumentsView from './components/DocumentsView';
import ProjectsDocumentsView from './components/ProjectsDocumentsView';
import AIChat from './components/AIChat';
import { createAIChatSession } from './services/geminiService';
import Icon from './components/Icon';
import SupportDashboard from './components/SupportDashboard';

const App = () => {
  return (
    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#f0f0f0'}}>
      <h1 style={{color: '#004c59', fontSize: '2.5rem', fontFamily: 'Arial, sans-serif'}}>Imports loaded successfully!</h1>
    </div>
  );
};

export default App;
