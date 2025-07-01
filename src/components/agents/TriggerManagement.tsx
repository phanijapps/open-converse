import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Clock, FileText, Database, Webhook, MessageCircle, Zap, Plus, Trash2, Play, Pause } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  description: string;
  agent_type: string;
  status: 'stopped' | 'running' | 'error';
}

interface Trigger {
  id: string;
  name: string;
  description: string;
  trigger_type: 'schedule' | 'file_change' | 'data_change' | 'webhook' | 'message' | 'custom';
  agent_id: string;
  agent_name: string;
  config: any;
  enabled: boolean;
  last_fired?: string;
  fire_count: number;
  created_at: string;
}

interface TriggerConfig {
  name: string;
  description: string;
  trigger_type: string;
  agent_id: string;
  config: any;
  enabled: boolean;
}

const TriggerManagement: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [newTrigger, setNewTrigger] = useState<TriggerConfig>({
    name: '',
    description: '',
    trigger_type: 'schedule',
    agent_id: '',
    config: {},
    enabled: true,
  });

  const triggerTypes = [
    {
      value: 'schedule',
      label: 'Schedule',
      icon: Clock,
      description: 'Run agent at specific times using cron expressions'
    },
    {
      value: 'file_change',
      label: 'File Change',
      icon: FileText,
      description: 'Trigger when files in specified paths change'
    },
    {
      value: 'data_change',
      label: 'Data Change',
      icon: Database,
      description: 'Trigger when data sources are updated'
    },
    {
      value: 'webhook',
      label: 'Webhook',
      icon: Webhook,
      description: 'Trigger via HTTP webhook calls'
    },
    {
      value: 'message',
      label: 'Message',
      icon: MessageCircle,
      description: 'Trigger when messages are received'
    },
    {
      value: 'custom',
      label: 'Custom',
      icon: Zap,
      description: 'Custom trigger logic'
    }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [agentList, triggerList] = await Promise.all([
        invoke<Agent[]>('list_agents'),
        invoke<Trigger[]>('list_triggers').catch(() => []), // Fallback to empty array if not implemented
      ]);
      setAgents(agentList.filter(agent => agent.status === 'running'));
      setTriggers(triggerList);
      setError(null);
    } catch (err) {
      setError(`Failed to load data: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const createTrigger = async () => {
    try {
      setLoading(true);
      await invoke('create_trigger', { config: newTrigger });
      
      // Reset form
      setNewTrigger({
        name: '',
        description: '',
        trigger_type: 'schedule',
        agent_id: '',
        config: {},
        enabled: true,
      });
      
      setShowCreateForm(false);
      await loadData();
    } catch (err) {
      setError(`Failed to create trigger: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleTrigger = async (triggerId: string, enabled: boolean) => {
    try {
      await invoke('toggle_trigger', { triggerId, enabled });
      setTriggers(prev => prev.map(t => 
        t.id === triggerId ? { ...t, enabled } : t
      ));
    } catch (err) {
      setError(`Failed to toggle trigger: ${err}`);
    }
  };

  const deleteTrigger = async (triggerId: string) => {
    try {
      await invoke('delete_trigger', { triggerId });
      setTriggers(prev => prev.filter(t => t.id !== triggerId));
    } catch (err) {
      setError(`Failed to delete trigger: ${err}`);
    }
  };

  const fireTrigger = async (triggerId: string) => {
    try {
      await invoke('fire_trigger', { triggerId });
      setError(null);
    } catch (err) {
      setError(`Failed to fire trigger: ${err}`);
    }
  };

  const renderTriggerConfig = () => {
    const { trigger_type } = newTrigger;

    switch (trigger_type) {
      case 'schedule':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="cron">Cron Expression</Label>
              <Input
                id="cron"
                value={newTrigger.config.cron_expression || ''}
                onChange={(e) => setNewTrigger(prev => ({
                  ...prev,
                  config: { ...prev.config, cron_expression: e.target.value }
                }))}
                placeholder="0 0 * * * (every hour)"
              />
              <p className="text-xs text-gray-500 mt-1">
                Examples: "0 0 * * *" (daily), "0 */6 * * *" (every 6 hours), "0 9-17 * * 1-5" (business hours)
              </p>
            </div>
            <div>
              <Label htmlFor="timezone">Timezone</Label>
              <Input
                id="timezone"
                value={newTrigger.config.timezone || 'UTC'}
                onChange={(e) => setNewTrigger(prev => ({
                  ...prev,
                  config: { ...prev.config, timezone: e.target.value }
                }))}
                placeholder="UTC"
              />
            </div>
          </div>
        );

      case 'file_change':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="watch_path">Watch Path</Label>
              <Input
                id="watch_path"
                value={newTrigger.config.watch_path || ''}
                onChange={(e) => setNewTrigger(prev => ({
                  ...prev,
                  config: { ...prev.config, watch_path: e.target.value }
                }))}
                placeholder="/path/to/watch"
              />
            </div>
            <div>
              <Label htmlFor="file_pattern">File Pattern (optional)</Label>
              <Input
                id="file_pattern"
                value={newTrigger.config.file_pattern || ''}
                onChange={(e) => setNewTrigger(prev => ({
                  ...prev,
                  config: { ...prev.config, file_pattern: e.target.value }
                }))}
                placeholder="*.txt, *.json, etc."
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="recursive"
                checked={newTrigger.config.recursive || false}
                onCheckedChange={(checked) => setNewTrigger(prev => ({
                  ...prev,
                  config: { ...prev.config, recursive: checked }
                }))}
              />
              <Label htmlFor="recursive">Watch subdirectories recursively</Label>
            </div>
          </div>
        );

      case 'webhook':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="endpoint">Webhook Endpoint Path</Label>
              <Input
                id="endpoint"
                value={newTrigger.config.endpoint || ''}
                onChange={(e) => setNewTrigger(prev => ({
                  ...prev,
                  config: { ...prev.config, endpoint: e.target.value }
                }))}
                placeholder="/webhook/my-trigger"
              />
              <p className="text-xs text-gray-500 mt-1">
                This will be available at: http://localhost:8000{newTrigger.config.endpoint || '/webhook/path'}
              </p>
            </div>
            <div>
              <Label htmlFor="method">HTTP Method</Label>
              <Select
                value={newTrigger.config.method || 'POST'}
                onValueChange={(value) => setNewTrigger(prev => ({
                  ...prev,
                  config: { ...prev.config, method: value }
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="secret">Webhook Secret (optional)</Label>
              <Input
                id="secret"
                type="password"
                value={newTrigger.config.secret || ''}
                onChange={(e) => setNewTrigger(prev => ({
                  ...prev,
                  config: { ...prev.config, secret: e.target.value }
                }))}
                placeholder="Optional secret for validation"
              />
            </div>
          </div>
        );

      case 'data_change':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="data_source">Data Source ID</Label>
              <Input
                id="data_source"
                value={newTrigger.config.data_source || ''}
                onChange={(e) => setNewTrigger(prev => ({
                  ...prev,
                  config: { ...prev.config, data_source: e.target.value }
                }))}
                placeholder="database_1, api_source, etc."
              />
            </div>
            <div>
              <Label htmlFor="change_type">Change Type</Label>
              <Select
                value={newTrigger.config.change_type || 'any'}
                onValueChange={(value) => setNewTrigger(prev => ({
                  ...prev,
                  config: { ...prev.config, change_type: value }
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any Change</SelectItem>
                  <SelectItem value="create">Create</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'message':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="channel">Message Channel</Label>
              <Input
                id="channel"
                value={newTrigger.config.channel || ''}
                onChange={(e) => setNewTrigger(prev => ({
                  ...prev,
                  config: { ...prev.config, channel: e.target.value }
                }))}
                placeholder="general, notifications, etc."
              />
            </div>
            <div>
              <Label htmlFor="filter">Message Filter (optional)</Label>
              <Input
                id="filter"
                value={newTrigger.config.filter || ''}
                onChange={(e) => setNewTrigger(prev => ({
                  ...prev,
                  config: { ...prev.config, filter: e.target.value }
                }))}
                placeholder="Keywords or regex pattern"
              />
            </div>
          </div>
        );

      case 'custom':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="custom_config">Custom Configuration (JSON)</Label>
              <Textarea
                id="custom_config"
                value={JSON.stringify(newTrigger.config, null, 2)}
                onChange={(e) => {
                  try {
                    const config = JSON.parse(e.target.value);
                    setNewTrigger(prev => ({ ...prev, config }));
                  } catch {
                    // Invalid JSON, ignore
                  }
                }}
                placeholder='{"key": "value"}'
                rows={6}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getTriggerIcon = (type: string) => {
    const triggerType = triggerTypes.find(t => t.value === type);
    return triggerType ? triggerType.icon : Zap;
  };

  const formatLastFired = (timestamp?: string) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Zap className="mx-auto h-8 w-8 animate-pulse text-blue-500 mb-4" />
          <p>Loading triggers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Trigger Management</h1>
          <p className="text-gray-600 mt-2">Configure automated triggers for your agents</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Trigger
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}

      {/* Create Trigger Form */}
      {showCreateForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create New Trigger</CardTitle>
            <CardDescription>Set up automated triggers for your agents</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="trigger_name">Trigger Name</Label>
                <Input
                  id="trigger_name"
                  value={newTrigger.name}
                  onChange={(e) => setNewTrigger(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="My Trigger"
                />
              </div>
              <div>
                <Label htmlFor="agent">Target Agent</Label>
                <Select
                  value={newTrigger.agent_id}
                  onValueChange={(value) => setNewTrigger(prev => ({ ...prev, agent_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map(agent => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name} ({agent.agent_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="trigger_description">Description</Label>
              <Textarea
                id="trigger_description"
                value={newTrigger.description}
                onChange={(e) => setNewTrigger(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this trigger does..."
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="trigger_type">Trigger Type</Label>
              <Select
                value={newTrigger.trigger_type}
                onValueChange={(value) => setNewTrigger(prev => ({ 
                  ...prev, 
                  trigger_type: value,
                  config: {} // Reset config when type changes
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {triggerTypes.map(type => {
                    const Icon = type.icon;
                    return (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <div>
                            <div className="font-medium">{type.label}</div>
                            <div className="text-sm text-gray-500">{type.description}</div>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Dynamic trigger configuration */}
            {renderTriggerConfig()}

            <div className="flex items-center space-x-2">
              <Switch
                id="enabled"
                checked={newTrigger.enabled}
                onCheckedChange={(checked) => setNewTrigger(prev => ({ ...prev, enabled: checked }))}
              />
              <Label htmlFor="enabled">Enable trigger immediately</Label>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
              <Button 
                onClick={createTrigger} 
                disabled={!newTrigger.name || !newTrigger.agent_id}
              >
                Create Trigger
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Triggers List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {triggers.map((trigger) => {
          const Icon = getTriggerIcon(trigger.trigger_type);
          return (
            <Card key={trigger.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-blue-500" />
                    <div>
                      <CardTitle className="text-lg">{trigger.name}</CardTitle>
                      <CardDescription className="mt-1">{trigger.description}</CardDescription>
                    </div>
                  </div>
                  <Badge className={trigger.enabled ? 'bg-green-500' : 'bg-gray-500'}>
                    {trigger.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm text-gray-600">
                    <div>Agent: <span className="font-medium">{trigger.agent_name}</span></div>
                    <div>Type: <span className="font-medium">{trigger.trigger_type}</span></div>
                    <div>Fired: <span className="font-medium">{trigger.fire_count} times</span></div>
                    <div>Last: <span className="font-medium">{formatLastFired(trigger.last_fired)}</span></div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => toggleTrigger(trigger.id, !trigger.enabled)}
                      className="flex items-center gap-1"
                    >
                      {trigger.enabled ? (
                        <>
                          <Pause className="h-3 w-3" />
                          Disable
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3" />
                          Enable
                        </>
                      )}
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => fireTrigger(trigger.id)}
                      className="flex items-center gap-1"
                    >
                      <Zap className="h-3 w-3" />
                      Fire
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete ${trigger.name}?`)) {
                          deleteTrigger(trigger.id);
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
          );
        })}
      </div>

      {triggers.length === 0 && !loading && (
        <div className="text-center py-12">
          <Zap className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No triggers found</h3>
          <p className="text-gray-600 mb-4">Set up automated triggers to make your agents more responsive</p>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Trigger
          </Button>
        </div>
      )}
    </div>
  );
};

export default TriggerManagement;
