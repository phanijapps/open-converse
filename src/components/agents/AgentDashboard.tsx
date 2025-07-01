import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  Bot, 
  Zap, 
  MessageSquare, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  TrendingUp,
  Database,
  Settings,
  Play
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Agent {
  id: string;
  name: string;
  description: string;
  agent_type: string;
  status: 'stopped' | 'running' | 'error';
  created_at: string;
  last_activity?: string;
}

interface DashboardStats {
  total_agents: number;
  running_agents: number;
  total_triggers: number;
  active_triggers: number;
  total_messages: number;
  recent_activities: ActivityEvent[];
}

interface ActivityEvent {
  id: string;
  type: 'agent_started' | 'agent_stopped' | 'trigger_fired' | 'message_sent' | 'error';
  description: string;
  timestamp: string;
  agent_name?: string;
}

const AgentDashboard: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    total_agents: 0,
    running_agents: 0,
    total_triggers: 0,
    active_triggers: 0,
    total_messages: 0,
    recent_activities: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
    
    // Set up periodic refresh
    const interval = setInterval(loadDashboardData, 10000); // Refresh every 10 seconds
    
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      const agentList = await invoke<Agent[]>('list_agents');
      setAgents(agentList);
      
      // Calculate stats
      const runningAgents = agentList.filter(agent => agent.status === 'running').length;
      
      // Mock data for other stats - in real implementation these would come from backend
      const mockStats: DashboardStats = {
        total_agents: agentList.length,
        running_agents: runningAgents,
        total_triggers: 5,
        active_triggers: 3,
        total_messages: 42,
        recent_activities: [
          {
            id: '1',
            type: 'agent_started',
            description: 'Chat Agent started successfully',
            timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
            agent_name: 'Chat Agent'
          },
          {
            id: '2',
            type: 'trigger_fired',
            description: 'Daily summary trigger executed',
            timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
            agent_name: 'Data Analysis Agent'
          },
          {
            id: '3',
            type: 'message_sent',
            description: 'User message processed',
            timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
            agent_name: 'Chat Agent'
          },
          {
            id: '4',
            type: 'agent_stopped',
            description: 'Workflow Agent stopped',
            timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
            agent_name: 'Workflow Agent'
          }
        ]
      };
      
      setStats(mockStats);
      setError(null);
    } catch (err) {
      setError(`Failed to load dashboard data: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const quickStartAgent = async (agentId: string) => {
    try {
      await invoke('start_agent', { agentId });
      await loadDashboardData(); // Refresh data
    } catch (err) {
      setError(`Failed to start agent: ${err}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-green-600 bg-green-100';
      case 'stopped': return 'text-gray-600 bg-gray-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'agent_started': return <Play className="h-4 w-4 text-green-600" />;
      case 'agent_stopped': return <Activity className="h-4 w-4 text-gray-600" />;
      case 'trigger_fired': return <Zap className="h-4 w-4 text-blue-600" />;
      case 'message_sent': return <MessageSquare className="h-4 w-4 text-purple-600" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatRelativeTime = (timestamp: string) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="mx-auto h-8 w-8 animate-spin text-blue-500 mb-4" />
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Database className="h-8 w-8" />
          Agent Dashboard
        </h1>
        <p className="text-gray-600 mt-2">Overview of your personal agent space</p>
      </div>

      {error && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_agents}</div>
            <p className="text-xs text-muted-foreground">
              {stats.running_agents} running
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Triggers</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active_triggers}</div>
            <p className="text-xs text-muted-foreground">
              of {stats.total_triggers} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages Today</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_messages}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              +12% from yesterday
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Healthy</div>
            <p className="text-xs text-muted-foreground">
              All systems operational
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest events from your agents</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recent_activities.length > 0 ? (
                stats.recent_activities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                    <div className="flex-shrink-0 mt-0.5">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.description}
                      </p>
                      {activity.agent_name && (
                        <p className="text-xs text-gray-500">
                          {activity.agent_name}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <p className="text-xs text-gray-500">
                        {formatRelativeTime(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="h-8 w-8 mx-auto mb-2" />
                  <p>No recent activity</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>Manage your agents</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Running Agents */}
            <div>
              <h4 className="text-sm font-medium mb-2">Running Agents</h4>
              <div className="space-y-2">
                {agents.filter(agent => agent.status === 'running').map(agent => (
                  <div key={agent.id} className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium">{agent.name}</span>
                    </div>
                    <Badge className={getStatusColor(agent.status)}>
                      {agent.status}
                    </Badge>
                  </div>
                ))}
                {agents.filter(agent => agent.status === 'running').length === 0 && (
                  <p className="text-sm text-gray-500">No agents running</p>
                )}
              </div>
            </div>

            {/* Stopped Agents */}
            <div>
              <h4 className="text-sm font-medium mb-2">Stopped Agents</h4>
              <div className="space-y-2">
                {agents.filter(agent => agent.status === 'stopped').slice(0, 3).map(agent => (
                  <div key={agent.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      <span className="text-sm">{agent.name}</span>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => quickStartAgent(agent.id)}
                      className="h-6 px-2 text-xs"
                    >
                      Start
                    </Button>
                  </div>
                ))}
                {agents.filter(agent => agent.status === 'stopped').length === 0 && (
                  <p className="text-sm text-gray-500">All agents running</p>
                )}
              </div>
            </div>

            {/* System Resources */}
            <div>
              <h4 className="text-sm font-medium mb-2">System Resources</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Memory Usage</span>
                  <span className="text-green-600">245MB / 2GB</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{width: '12%'}}></div>
                </div>
                
                <div className="flex justify-between text-sm mt-3">
                  <span>CPU Usage</span>
                  <span className="text-blue-600">8%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{width: '8%'}}></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AgentDashboard;
