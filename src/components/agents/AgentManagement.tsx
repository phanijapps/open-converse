import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Play, Square, Settings, Trash2, Plus, Activity } from 'lucide-react';
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

interface AgentConfig {
  name: string;
  description: string;
  agent_type: string;
  script_path?: string;
  environment_variables: Record<string, string>;
  requirements: string[];
  triggers: any[];
  data_connectors: string[];
  memory_limit_mb: number;
  timeout_seconds: number;
}

const AgentManagement: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [agentLogs, setAgentLogs] = useState<string[]>([]);

  // Form state for creating new agents
  const [newAgentConfig, setNewAgentConfig] = useState<AgentConfig>({
    name: '',
    description: '',
    agent_type: 'chat',
    environment_variables: {},
    requirements: [],
    triggers: [],
    data_connectors: [],
    memory_limit_mb: 512,
    timeout_seconds: 30,
  });

  const agentTypes = [
    { value: 'chat', label: 'Chat Agent', description: 'Conversational agent for chat interactions' },
    { value: 'data_analysis', label: 'Data Analysis Agent', description: 'Agent for analyzing and processing data' },
    { value: 'workflow', label: 'Workflow Agent', description: 'Agent for orchestrating workflows and tasks' },
    { value: 'custom', label: 'Custom Agent', description: 'Custom agent with your own implementation' },
  ];

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      setLoading(true);
      const agentList = await invoke<Agent[]>('list_agents');
      setAgents(agentList);
      setError(null);
    } catch (err) {
      setError(`Failed to load agents: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const createAgent = async () => {
    try {
      setLoading(true);
      await invoke('create_agent', { config: newAgentConfig });
      
      // Reset form
      setNewAgentConfig({
        name: '',
        description: '',
        agent_type: 'chat',
        environment_variables: {},
        requirements: [],
        triggers: [],
        data_connectors: [],
        memory_limit_mb: 512,
        timeout_seconds: 30,
      });
      
      setShowCreateForm(false);
      await loadAgents(); // Reload the agent list
    } catch (err) {
      setError(`Failed to create agent: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const startAgent = async (agentId: string) => {
    try {
      await invoke('start_agent', { agentId });
      await loadAgents(); // Refresh the list
    } catch (err) {
      setError(`Failed to start agent: ${err}`);
    }
  };

  const stopAgent = async (agentId: string) => {
    try {
      await invoke('stop_agent', { agentId });
      await loadAgents(); // Refresh the list
    } catch (err) {
      setError(`Failed to stop agent: ${err}`);
    }
  };

  const deleteAgent = async (agentId: string) => {
    try {
      await invoke('delete_agent', { agentId });
      await loadAgents(); // Refresh the list
    } catch (err) {
      setError(`Failed to delete agent: ${err}`);
    }
  };

  const getAgentStatus = async (agentId: string) => {
    try {
      const status = await invoke('get_agent_status', { agentId });
      console.log('Agent status:', status);
    } catch (err) {
      console.error('Failed to get agent status:', err);
    }
  };

  const getAgentLogs = async (agentId: string) => {
    try {
      const logs = await invoke<string[]>('get_agent_logs', { agentId });
      setAgentLogs(logs);
    } catch (err) {
      console.error('Failed to get agent logs:', err);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-500';
      case 'stopped': return 'bg-gray-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const addEnvironmentVariable = () => {
    const key = prompt('Environment variable name:');
    const value = prompt('Environment variable value:');
    if (key && value) {
      setNewAgentConfig(prev => ({
        ...prev,
        environment_variables: {
          ...prev.environment_variables,
          [key]: value
        }
      }));
    }
  };

  const addRequirement = () => {
    const requirement = prompt('Python package name (e.g., requests, numpy):');
    if (requirement) {
      setNewAgentConfig(prev => ({
        ...prev,
        requirements: [...prev.requirements, requirement]
      }));
    }
  };

  if (loading && agents.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="mx-auto h-8 w-8 animate-spin text-blue-500 mb-4" />
          <p>Loading agents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Agent Management</h1>
          <p className="text-gray-600 mt-2">Create, configure, and manage your Python agents</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Agent
        </Button>
      </div>

      {error && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Create Agent Form */}
      {showCreateForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create New Agent</CardTitle>
            <CardDescription>Configure a new Python agent</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Agent Name</Label>
                <Input
                  id="name"
                  value={newAgentConfig.name}
                  onChange={(e) => setNewAgentConfig(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="My Agent"
                />
              </div>
              <div>
                <Label htmlFor="type">Agent Type</Label>
                <Select 
                  value={newAgentConfig.agent_type} 
                  onValueChange={(value) => setNewAgentConfig(prev => ({ ...prev, agent_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select agent type" />
                  </SelectTrigger>
                  <SelectContent>
                    {agentTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <div>
                          <div className="font-medium">{type.label}</div>
                          <div className="text-sm text-gray-500">{type.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newAgentConfig.description}
                onChange={(e) => setNewAgentConfig(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this agent does..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="memory">Memory Limit (MB)</Label>
                <Input
                  id="memory"
                  type="number"
                  value={newAgentConfig.memory_limit_mb}
                  onChange={(e) => setNewAgentConfig(prev => ({ ...prev, memory_limit_mb: parseInt(e.target.value) }))}
                />
              </div>
              <div>
                <Label htmlFor="timeout">Timeout (seconds)</Label>
                <Input
                  id="timeout"
                  type="number"
                  value={newAgentConfig.timeout_seconds}
                  onChange={(e) => setNewAgentConfig(prev => ({ ...prev, timeout_seconds: parseInt(e.target.value) }))}
                />
              </div>
            </div>

            {/* Environment Variables */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Environment Variables</Label>
                <Button variant="outline" size="sm" onClick={addEnvironmentVariable}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>
              <div className="space-y-2">
                {Object.entries(newAgentConfig.environment_variables).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <span className="font-mono text-sm">{key}={value}</span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        const newVars = { ...newAgentConfig.environment_variables };
                        delete newVars[key];
                        setNewAgentConfig(prev => ({ ...prev, environment_variables: newVars }));
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Python Requirements */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Python Requirements</Label>
                <Button variant="outline" size="sm" onClick={addRequirement}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {newAgentConfig.requirements.map((req, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {req}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-4 w-4 p-0"
                      onClick={() => {
                        const newReqs = newAgentConfig.requirements.filter((_, i) => i !== index);
                        setNewAgentConfig(prev => ({ ...prev, requirements: newReqs }));
                      }}
                    >
                      ×
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
              <Button onClick={createAgent} disabled={!newAgentConfig.name}>
                Create Agent
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agents List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map((agent) => (
          <Card key={agent.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{agent.name}</CardTitle>
                  <CardDescription className="mt-1">{agent.description}</CardDescription>
                </div>
                <Badge className={`${getStatusBadgeColor(agent.status)} text-white`}>
                  {agent.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm text-gray-600">
                  <div>Type: <span className="font-medium">{agent.agent_type}</span></div>
                  <div>Created: <span className="font-medium">{new Date(agent.created_at).toLocaleDateString()}</span></div>
                  {agent.last_activity && (
                    <div>Last Activity: <span className="font-medium">{new Date(agent.last_activity).toLocaleString()}</span></div>
                  )}
                </div>
                
                <div className="flex gap-2">
                  {agent.status === 'running' ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => stopAgent(agent.id)}
                      className="flex items-center gap-1"
                    >
                      <Square className="h-3 w-3" />
                      Stop
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => startAgent(agent.id)}
                      className="flex items-center gap-1"
                    >
                      <Play className="h-3 w-3" />
                      Start
                    </Button>
                  )}
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setSelectedAgent(agent);
                      getAgentStatus(agent.id);
                      getAgentLogs(agent.id);
                    }}
                    className="flex items-center gap-1"
                  >
                    <Settings className="h-3 w-3" />
                    Details
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete ${agent.name}?`)) {
                        deleteAgent(agent.id);
                      }
                    }}
                    className="flex items-center gap-1 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {agents.length === 0 && !loading && (
        <div className="text-center py-12">
          <Activity className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No agents found</h3>
          <p className="text-gray-600 mb-4">Get started by creating your first agent</p>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Agent
          </Button>
        </div>
      )}

      {/* Agent Details Modal */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Agent Details: {selectedAgent.name}</CardTitle>
              <CardDescription>Status, logs, and configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Recent Logs</h4>
                <div className="bg-gray-900 text-green-400 p-3 rounded font-mono text-sm max-h-64 overflow-y-auto">
                  {agentLogs.length > 0 ? (
                    agentLogs.map((log, index) => (
                      <div key={index}>{log}</div>
                    ))
                  ) : (
                    <div className="text-gray-500">No logs available</div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button onClick={() => setSelectedAgent(null)}>Close</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AgentManagement;
