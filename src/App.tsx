import React, { useState, useEffect } from 'react';
import { AppSidebar, NavTab } from './components/layout/AppSidebar.tsx';
import { AppHeader } from './components/layout/AppHeader.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { ProjectsPage } from './pages/ProjectsPage.tsx';
import { ProjectDetailPage } from './pages/ProjectDetailPage.tsx';
import { TechnologyExplorerPage } from './pages/TechnologyExplorerPage.tsx';
import { AuditPage } from './pages/AuditPage.tsx';
import { KnowledgeBasePage } from './pages/KnowledgeBasePage.tsx';
import { SettingsPage } from './pages/SettingsPage.tsx';
import { ApplicationSettings, ProjectMetadata } from '../shared/types/atlas.types.ts';
import { AtlasClient } from './services/api.ts';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [settings, setSettings] = useState<ApplicationSettings | null>(null);
  const [projects, setProjects] = useState<ProjectMetadata[]>([]);
  const [auditsCount, setAuditsCount] = useState(0);

  useEffect(() => {
    loadInitialState();
  }, []);

  const loadInitialState = async () => {
    try {
      const [s, p] = await Promise.all([
        AtlasClient.getSettings(),
        AtlasClient.getProjects(),
      ]);
      setSettings(s);
      setProjects(p);

      if (p.length > 0) {
        const histories = await Promise.all(p.map((item) => AtlasClient.getAuditHistory(item.id)));
        const total = histories.reduce((sum, curr) => sum + curr.length, 0);
        setAuditsCount(total);
      }
    } catch (err) {
      console.error('Error al inicializar Atlas', err);
    }
  };

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setActiveTab('projects');
  };

  const handleStartAudit = (projectId: string) => {
    setSelectedProjectId(projectId);
    setActiveTab('audits');
  };

  const activeProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#070a0f] text-slate-100 font-sans">
      {/* Sidebar Navigation */}
      <AppSidebar
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (tab === 'projects' && selectedProjectId) {
            setSelectedProjectId(null); // Reset back to projects list when clicking sidebar
          }
          setActiveTab(tab);
        }}
        projectsCount={projects.length}
        auditsCount={auditsCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <AppHeader
          settings={settings}
          activeProjectName={activeProject?.name}
          onOpenSettings={() => setActiveTab('settings')}
        />

        {/* Viewport Content */}
        <main className="flex-1 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <DashboardPage
              onNavigate={(tab, projId) => {
                if (projId) setSelectedProjectId(projId);
                setActiveTab(tab as NavTab);
              }}
            />
          )}

          {activeTab === 'projects' && !selectedProjectId && (
            <ProjectsPage onSelectProject={handleSelectProject} />
          )}

          {activeTab === 'projects' && selectedProjectId && (
            <ProjectDetailPage
              projectId={selectedProjectId}
              onBack={() => setSelectedProjectId(null)}
              onStartAudit={handleStartAudit}
            />
          )}

          {activeTab === 'research' && <TechnologyExplorerPage />}

          {activeTab === 'audits' && (
            <AuditPage initialProjectId={selectedProjectId || undefined} />
          )}

          {activeTab === 'knowledge' && <KnowledgeBasePage />}

          {activeTab === 'settings' && <SettingsPage />}
        </main>
      </div>
    </div>
  );
}
