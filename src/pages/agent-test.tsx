import React, { useState, useEffect } from 'react';
import { AgentFactory } from '@/agents';
import { readSettings, writeSettings } from '@/utils/settings';
import type { SettingsData, ProviderConfig } from '@shared/types';

const AgentTestPage: React.FC = () => {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [testMessage, setTestMessage] = useState('Hello! Can you help me understand TypeScript?');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const currentSettings = await readSettings();
      setSettings(currentSettings);
      setIsConfigured(AgentFactory.validateSettings(currentSettings));
      
      // Check if OpenRouter is configured
      const openrouterProvider = currentSettings.providers.find(
        p => p.id === 'openrouter' || p.base_url.includes('openrouter.ai')
      );
      if (openrouterProvider?.api_key) {
        setApiKey(openrouterProvider.api_key);
      }
    } catch (err) {
      setError(`Failed to load settings: ${err}`);
    }
  };

  const configureOpenRouter = async () => {
    if (!apiKey.trim()) {
      setError('Please enter an API key');
      return;
    }

    try {
      const newProvider: ProviderConfig = {
        id: 'openrouter',
        description: 'OpenRouter API for multiple models',
        enabled: true,
        base_url: 'https://openrouter.ai/api/v1',
        api_key: apiKey.trim()
      };

      const updatedSettings: SettingsData = {
        ...settings!,
        providers: [
          ...settings!.providers.filter(p => p.id !== 'openrouter'),
          newProvider
        ]
      };

      await writeSettings(updatedSettings);
      setSettings(updatedSettings);
      setIsConfigured(true);
      setError(null);
    } catch (err) {
      setError(`Failed to save settings: ${err}`);
    }
  };

  const testAgent = async () => {
    if (!settings || !isConfigured) {
      setError('Please configure API settings first');
      return;
    }

    setIsLoading(true);
    setError(null);
    setTestResult(null);

    try {
      // Create agent directly and make API call
      const agent = AgentFactory.createAgent('general', settings);
      const response = await agent.sendMessage(testMessage);
      setTestResult(response);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Test failed';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const agentTypes = AgentFactory.getAllAgentTypes();
  const agentInfo = AgentFactory.getAgentTypeInfo();

  // Force scrolling with native CSS override for Tauri
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'tauri-scroll-fix';
    style.textContent = `
      html, body, #__next {
        overflow: visible !important;
        height: auto !important;
        max-height: none !important;
      }
      .tauri-scroll-container {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        overflow-y: auto;
        overflow-x: hidden;
        background: #f7fafc;
      }
      .tauri-scroll-content {
        padding: 32px 16px;
        max-width: 768px;
        margin: 0 auto;
        min-height: 200vh; /* Force content height to enable scroll */
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      const existingStyle = document.getElementById('tauri-scroll-fix');
      if (existingStyle) {
        document.head.removeChild(existingStyle);
      }
    };
  }, []);

  return (
    <div className="tauri-scroll-container">
      <div className="tauri-scroll-content">
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '16px' }}>
            🤖 Agent System Test & Configuration
          </h1>
          <p style={{ color: '#718096', fontSize: '16px' }}>
            Test and configure your AI agent system. Make sure you have an OpenRouter API key.
          </p>
        </div>

        {/* Status */}
        <div 
          style={{
            background: isConfigured ? "#f0fff4" : "#fffbeb",
            padding: '16px',
            borderRadius: '8px',
            border: `1px solid ${isConfigured ? "#9ae6b4" : "#f6e05e"}`,
            marginBottom: '24px'
          }}
        >
          <p style={{ color: isConfigured ? "#38a169" : "#d69e2e", fontWeight: '500' }}>
            {isConfigured 
              ? "✅ Agent system configured and ready!" 
              : "⚠️ Agent system needs configuration"
            }
          </p>
        </div>

        {error && (
          <div 
            style={{
              background: "#fed7d7",
              padding: '16px',
              borderRadius: '8px',
              border: "1px solid #feb2b2",
              marginBottom: '24px'
            }}
          >
            <p style={{ color: "#c53030" }}>{error}</p>
          </div>
        )}

        {/* Configuration Section */}
        <div style={{ 
          background: 'white', 
          padding: '24px', 
          borderRadius: '12px', 
          marginBottom: '32px', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>
            1. Configuration
          </h2>
        
          {!isConfigured && (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  OpenRouter API Key:
                </label>
                <input
                  type="password"
                  placeholder="Enter your OpenRouter API key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '14px',
                    marginBottom: '8px'
                  }}
                />
                <p style={{ fontSize: '12px', color: '#718096' }}>
                  Get your API key from https://openrouter.ai/keys
                </p>
              </div>
              
              <button 
                onClick={configureOpenRouter}
                disabled={!apiKey.trim()}
                style={{
                  background: apiKey.trim() ? '#3182ce' : '#a0aec0',
                  color: 'white',
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: apiKey.trim() ? 'pointer' : 'not-allowed',
                  fontWeight: '500'
                }}
              >
                Configure OpenRouter
              </button>
            </div>
          )}

          {isConfigured && settings && (
            <div>
              <p style={{ color: '#38a169', fontWeight: '500', marginBottom: '12px' }}>
                ✅ Configuration Status:
              </p>
              {settings.providers.map((provider, idx) => (
                <div key={idx} style={{ 
                  padding: '12px', 
                  background: '#f8f9fa', 
                  borderRadius: '6px', 
                  marginBottom: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>{provider.description}</span>
                  <span style={{
                    background: provider.enabled ? '#48bb78' : '#a0aec0',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}>
                    {provider.enabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Agent Types */}
        <div style={{ 
          background: 'white', 
          padding: '24px', 
          borderRadius: '12px', 
          marginBottom: '32px', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>
            2. Available Agent Types
          </h2>
          <div>
            {agentInfo.map((agent) => (
              <div key={agent.type} style={{
                padding: '16px',
                background: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                marginBottom: '12px'
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  marginBottom: '8px' 
                }}>
                  <span style={{
                    background: '#3182ce',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}>
                    {agent.type}
                  </span>
                  <span style={{ fontSize: '12px', color: '#718096' }}>
                    Temp: {agent.temperature} | Max: {agent.maxTokens}
                  </span>
                </div>
                <h3 style={{ fontWeight: '500', marginBottom: '4px' }}>{agent.name}</h3>
                <p style={{ fontSize: '14px', color: '#718096' }}>{agent.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Test Section */}
        <div style={{ 
          background: '#ebf8ff', 
          padding: '24px', 
          borderRadius: '12px', 
          marginBottom: '32px', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>
            3. Test Agent
          </h2>
        
          <div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Test Message:
              </label>
              <textarea
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="Enter a message to test the agent"
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>

            <button 
              onClick={testAgent}
              disabled={!isConfigured || !testMessage.trim() || isLoading}
              style={{
                background: (!isConfigured || !testMessage.trim() || isLoading) ? '#a0aec0' : '#3182ce',
                color: 'white',
                padding: '12px 24px',
                border: 'none',
                borderRadius: '6px',
                cursor: (!isConfigured || !testMessage.trim() || isLoading) ? 'not-allowed' : 'pointer',
                fontWeight: '500',
                marginBottom: '16px'
              }}
            >
              {isLoading ? 'Testing Agent...' : 'Test Agent'}
            </button>

            {testResult && (
              <div style={{
                background: 'white',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #9ae6b4'
              }}>
                <p style={{ fontWeight: '500', color: '#38a169', marginBottom: '8px' }}>
                  ✅ Agent Response:
                </p>
                <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{testResult}</p>
              </div>
            )}
          </div>
        </div>

        {/* Next Steps */}
        <div style={{ 
          background: 'white', 
          padding: '24px', 
          borderRadius: '12px', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>
            4. Next Steps
          </h2>
          <div>
            <p style={{ marginBottom: '8px' }}>• Navigate to /chat-demo to test the full UI</p>
            <p style={{ marginBottom: '8px' }}>• Use the agent selector to try different agent types</p>
            <p style={{ marginBottom: '8px' }}>• Check the browser console for detailed error messages</p>
            <p>• Visit /settings to configure more providers</p>
          </div>
        </div>

        {/* Extra content to ensure scroll */}
        <div style={{ height: '500px', background: 'transparent' }}>
          <p style={{ textAlign: 'center', color: '#a0aec0', paddingTop: '100px' }}>
            🎉 If you can see this text, scrolling is working! 🎉
          </p>
        </div>
      </div>
    </div>
  );
};

export default AgentTestPage;
