import React, { useState, useCallback, useEffect } from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { Allotment } from 'allotment';
import Editor from '@monaco-editor/react';
import 'allotment/dist/style.css';

// API response handling for DDEX operations

// Sample DDEX XML files for testing
const SAMPLE_FILES = {
  'ERN 4.3 Simple': `<?xml version="1.0" encoding="UTF-8"?>
<ern:NewReleaseMessage xmlns:ern="http://ddex.net/xml/ern/43" MessageSchemaVersionId="ern/43" LanguageAndScriptCode="en">
  <MessageHeader>
    <MessageThreadId>PLAYGROUND_MSG_001</MessageThreadId>
    <MessageId>MSG_PLAYGROUND_2024</MessageId>
    <MessageSender>
      <PartyId>PLAYGROUND_LABEL</PartyId>
      <PartyName><FullName>Playground Record Label</FullName></PartyName>
    </MessageSender>
    <MessageRecipient>
      <PartyId>PLAYGROUND_DSP</PartyId>
      <PartyName><FullName>Playground Streaming Platform</FullName></PartyName>
    </MessageRecipient>
    <MessageCreatedDateTime>2024-01-15T10:00:00Z</MessageCreatedDateTime>
  </MessageHeader>
  <ReleaseList>
    <Release>
      <ReleaseReference>R1</ReleaseReference>
      <ReleaseType>Single</ReleaseType>
      <ReleaseId>
        <GRid>A1-PLAYGROUND-GRID-001</GRid>
      </ReleaseId>
      <ReferenceTitle>
        <TitleText>Sample Track Release</TitleText>
      </ReferenceTitle>
    </Release>
  </ReleaseList>
  <ResourceList>
    <SoundRecording>
      <ResourceReference>A1</ResourceReference>
      <SoundRecordingId>
        <ISRC>USPLAYG240001</ISRC>
      </SoundRecordingId>
      <ReferenceTitle>
        <TitleText>Sample Track</TitleText>
      </ReferenceTitle>
    </SoundRecording>
  </ResourceList>
  <DealList>
    <ReleaseDeal>
      <DealReleaseReference>R1</DealReleaseReference>
      <Deal>
        <DealReference>D1</DealReference>
        <TerritoryCode>Worldwide</TerritoryCode>
        <StartDate>2024-01-15</StartDate>
      </Deal>
    </ReleaseDeal>
  </DealList>
</ern:NewReleaseMessage>`,
  
  'ERN 4.2 Example': `<?xml version="1.0" encoding="UTF-8"?>
<ern:NewReleaseMessage xmlns:ern="http://ddex.net/xml/ern/42" MessageSchemaVersionId="ern/42" LanguageAndScriptCode="en">
  <MessageHeader>
    <MessageThreadId>PLAYGROUND_MSG_42</MessageThreadId>
    <MessageId>MSG_PLAYGROUND_42_2024</MessageId>
    <MessageSender>
      <PartyId>INDIE_LABEL_42</PartyId>
      <PartyName><FullName>Indie Music Label 4.2</FullName></PartyName>
    </MessageSender>
    <MessageRecipient>
      <PartyId>STREAMING_SERVICE_42</PartyId>
      <PartyName><FullName>Streaming Platform 4.2</FullName></PartyName>
    </MessageRecipient>
    <MessageCreatedDateTime>2024-01-15T11:00:00Z</MessageCreatedDateTime>
  </MessageHeader>
  <ReleaseList>
    <Release>
      <ReleaseReference>R1</ReleaseReference>
      <ReleaseType>Album</ReleaseType>
      <ReleaseId>
        <GRid>A1-INDIE-GRID-001</GRid>
      </ReleaseId>
      <ReferenceTitle>
        <TitleText>Indie Rock Album</TitleText>
      </ReferenceTitle>
    </Release>
  </ReleaseList>
  <ResourceList>
    <SoundRecording>
      <ResourceReference>A1</ResourceReference>
      <SoundRecordingId>
        <ISRC>USIND240001</ISRC>
      </SoundRecordingId>
      <ReferenceTitle>
        <TitleText>Indie Rock Anthem</TitleText>
      </ReferenceTitle>
    </SoundRecording>
    <SoundRecording>
      <ResourceReference>A2</ResourceReference>
      <SoundRecordingId>
        <ISRC>USIND240002</ISRC>
      </SoundRecordingId>
      <ReferenceTitle>
        <TitleText>Alternative Dreams</TitleText>
      </ReferenceTitle>
    </SoundRecording>
  </ResourceList>
  <DealList>
    <ReleaseDeal>
      <DealReleaseReference>R1</DealReleaseReference>
      <Deal>
        <DealReference>D1</DealReference>
        <TerritoryCode>US</TerritoryCode>
        <StartDate>2024-02-01</StartDate>
      </Deal>
    </ReleaseDeal>
  </DealList>
</ern:NewReleaseMessage>`,

  'Builder Template': JSON.stringify({
    messageHeader: {
      messageId: "MSG_BUILD_001",
      messageSenderName: "My Record Label",
      messageRecipientName: "Streaming Platform",
      messageCreatedDateTime: new Date().toISOString()
    },
    releases: [{
      releaseId: "REL_001",
      title: "My New Album",
      artist: "Amazing Artist",
      releaseType: "Album",
      label: "My Record Label",
      upc: "123456789012",
      releaseDate: "2024-03-01",
      territories: ["US", "CA", "GB"],
      genres: ["Pop", "Electronic"],
      trackIds: ["TR_001", "TR_002"]
    }],
    resources: [{
      resourceId: "TR_001",
      resourceType: "SoundRecording",
      title: "Hit Single",
      artist: "Amazing Artist",
      isrc: "US-AWE-24-00001",
      duration: "PT3M30S",
      trackNumber: 1
    }, {
      resourceId: "TR_002", 
      resourceType: "SoundRecording",
      title: "Another Track",
      artist: "Amazing Artist",
      isrc: "US-AWE-24-00002",
      duration: "PT4M15S",
      trackNumber: 2
    }],
    deals: [{
      dealId: "DEAL_001",
      releaseId: "REL_001",
      territories: ["US", "CA", "GB"],
      useTypes: ["Stream", "PermanentDownload"],
      commercialModelType: "Subscription",
      dealStartDate: "2024-03-01"
    }]
  }, null, 2),

};

interface PlaygroundState {
  mode: 'parser' | 'builder';
  input: string;
  output: string;
  loading: boolean;
  error: string;
  selectedPreset: string;
  apiStatus: 'checking' | 'online' | 'offline';
}

function PlaygroundComponent() {
  const [state, setState] = useState<PlaygroundState>({
    mode: 'parser',
    input: SAMPLE_FILES['ERN 4.3 Simple'],
    output: '',
    loading: false,
    error: '',
    selectedPreset: 'none',
    apiStatus: 'checking'
  });

  // Check API health on component mount
  useEffect(() => {
    async function checkApiHealth() {
      try {
        const response = await fetch('/health');
        if (response.ok) {
          setState(prev => ({ ...prev, apiStatus: 'online' }));
          console.log('DDEX API is online and ready');
        } else {
          setState(prev => ({ ...prev, apiStatus: 'offline' }));
        }
      } catch (error) {
        console.error('API health check failed:', error);
        setState(prev => ({ ...prev, apiStatus: 'offline' }));
      }
    }

    checkApiHealth();
  }, []);

  const parseXML = useCallback(async (xml: string): Promise<any> => {
    try {
      const response = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xml: xml })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const parsedData = await response.json();
      // parsedData is the direct object with messageId, releases, etc.
      return parsedData;
    } catch (error) {
      console.error('Error parsing XML:', error);
      throw error;
    }
  }, []);

  const buildXML = useCallback(async (json: string): Promise<string> => {
    const trimmedInput = json.trim();
    if (trimmedInput.startsWith('<?xml') || trimmedInput.startsWith('<')) {
      throw new Error('Builder mode requires JSON input. Please switch to Parser mode or load the "Builder Template" sample.');
    }

    try {
      const parsedData = JSON.parse(json);

      const response = await fetch('/api/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedData) // Send the parsed data directly
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Build failed' }));
        throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const { xml } = await response.json();
      // xml is the string containing the built DDEX XML
      return xml;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Invalid JSON input. Please check your JSON syntax.');
      }
      throw error;
    }
  }, [state.selectedPreset]);


  const handleProcess = useCallback(async () => {
    if (!state.input.trim()) {
      setState(prev => ({ ...prev, error: 'Please provide input data', output: '' }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: '', output: '' }));

    try {
      let result: string;
      
      if (state.mode === 'parser') {
        const parsed = await parseXML(state.input);
        result = JSON.stringify(parsed, null, 2);
      } else {
        result = await buildXML(state.input);
      }
      
      setState(prev => ({ ...prev, output: result, loading: false }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: errorMessage,
        output: `Error: ${errorMessage}`
      }));
    }
  }, [state.input, state.mode, parseXML, buildXML]);

  const handleModeChange = useCallback((newMode: 'parser' | 'builder') => {
    // Reset input to appropriate default when switching modes
    let defaultInput = SAMPLE_FILES['ERN 4.3 Simple'];
    if (newMode === 'builder') {
      defaultInput = SAMPLE_FILES['Builder Template'];
    }

    setState(prev => ({
      ...prev,
      mode: newMode,
      input: defaultInput,
      output: '',
      error: ''
    }));
  }, []);

  const loadSample = useCallback((sampleName: keyof typeof SAMPLE_FILES) => {
    const sampleContent = SAMPLE_FILES[sampleName];
    const isXmlSample = sampleName.startsWith('ERN');
    const isJsonSample = sampleName === 'Builder Template';

    // Warn if loading incompatible sample type
    let warning = '';
    if (state.mode === 'builder' && isXmlSample) {
      warning = 'XML samples are for Parser mode. Switch to Parser mode or choose a JSON template.';
    } else if (state.mode === 'parser' && isJsonSample) {
      warning = 'JSON templates are for Builder mode. Switch modes or choose an ERN sample.';
    }
    
    setState(prev => ({
      ...prev,
      input: sampleContent,
      output: '',
      error: warning
    }));
  }, [state.mode]);

  const exportOutput = useCallback(() => {
    if (!state.output) return;
    
    const isJsonOutput = state.mode === 'parser';
    
    const blob = new Blob([state.output], { 
      type: isJsonOutput ? 'application/json' : 'application/xml' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    let filename = 'output';
    if (state.mode === 'parser') {
      filename = 'parsed-data.json';
    } else {
      filename = 'generated.xml';
    }
    
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [state.output, state.mode]);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ 
        padding: '1rem', 
        borderBottom: '1px solid var(--ifm-color-emphasis-200)',
        backgroundColor: 'var(--ifm-background-color)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Playground v0.4.5</h1>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              className={`button ${state.mode === 'parser' ? 'button--primary' : 'button--secondary'}`}
              onClick={() => handleModeChange('parser')}
            >
              Parser Mode
            </button>
            <button
              className={`button ${state.mode === 'builder' ? 'button--primary' : 'button--secondary'}`}
              onClick={() => handleModeChange('builder')}
            >
              Builder Mode
            </button>

            <div style={{ marginLeft: 'auto', fontSize: '0.9rem', fontWeight: '500' }}>
              {state.apiStatus === 'online' && (
                <span style={{ color: '#28a745' }}>● API Online</span>
              )}
              {state.apiStatus === 'offline' && (
                <span style={{ color: '#dc3545' }}>● API Offline</span>
              )}
              {state.apiStatus === 'checking' && (
                <span style={{ color: '#ffc107' }}>● Checking API...</span>
              )}
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <label style={{ marginRight: '0.5rem', fontSize: '0.9rem' }}>Load Sample:</label>
            <select 
              onChange={(e) => loadSample(e.target.value as keyof typeof SAMPLE_FILES)}
              value=""
            >
              <option value="">Choose a sample...</option>
              {Object.keys(SAMPLE_FILES).map(name => {
                const isXmlSample = name.startsWith('ERN');
                const isJsonSample = name === 'Builder Template';
                const isCompatible = (state.mode === 'parser' && isXmlSample) ||
                                   (state.mode === 'builder' && isJsonSample);
                return (
                  <option key={name} value={name} disabled={!isCompatible}>
                    {name} {!isCompatible ? `(for ${isXmlSample ? 'Parser' : 'Builder'} mode)` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {state.mode === 'builder' && (
            <div>
              <label style={{ marginRight: '0.5rem', fontSize: '0.9rem' }}>Preset:</label>
              <select
                value={state.selectedPreset}
                onChange={(e) => setState(prev => ({ ...prev, selectedPreset: e.target.value }))}
              >
                <option value="none">No Preset</option>
                <option value="generic">Generic</option>
                <option value="youtube_music">YouTube Music</option>
              </select>
            </div>
          )}
          
          <button
            className="button button--primary"
            onClick={handleProcess}
            disabled={state.loading || state.apiStatus !== 'online'}
          >
            {state.loading ? 'Processing...' :
             state.apiStatus === 'checking' ? 'Checking API...' :
             state.apiStatus === 'offline' ? 'API Offline' :
             state.mode === 'parser' ? 'Parse XML' :
 'Build XML'}
          </button>
          
          {state.output && (
            <button
              className="button button--secondary"
              onClick={exportOutput}
            >
              Export {state.mode === 'parser' ? 'JSON' : 'XML'}
            </button>
          )}
        </div>

        {state.error && (
          <div style={{ 
            marginTop: '1rem', 
            padding: '0.5rem', 
            backgroundColor: 'var(--ifm-color-danger-contrast-background)',
            color: 'var(--ifm-color-danger)',
            borderRadius: '4px',
            fontSize: '0.9rem'
          }}>
            {state.error}
          </div>
        )}
      </div>

      {/* Main content area with split panes */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <Allotment defaultSizes={[50, 50]}>
          <Allotment.Pane>
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ 
                padding: '0.5rem 1rem', 
                borderBottom: '1px solid var(--ifm-color-emphasis-200)',
                backgroundColor: 'var(--ifm-color-emphasis-100)',
                fontSize: '0.9rem',
                fontWeight: 'bold'
              }}>
                Input ({state.mode === 'parser' ? 'XML' : 'JSON'})
              </div>
              <div style={{ flex: 1 }}>
                <Editor
                  language={state.mode === 'parser' ? 'xml' : 'json'}
                  value={state.input}
                  onChange={(value) => setState(prev => ({ ...prev, input: value || '' }))}
                  options={{
                    minimap: { enabled: false },
                    lineNumbers: 'on',
                    wordWrap: 'on',
                    automaticLayout: true,
                    scrollBeyondLastLine: false,
                    fontSize: 14
                  }}
                  theme="vs-dark"
                />
              </div>
            </div>
          </Allotment.Pane>
          
          <Allotment.Pane>
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ 
                padding: '0.5rem 1rem', 
                borderBottom: '1px solid var(--ifm-color-emphasis-200)',
                backgroundColor: 'var(--ifm-color-emphasis-100)',
                fontSize: '0.9rem',
                fontWeight: 'bold'
              }}>
                Output ({state.mode === 'parser' ? 'JSON' : 'XML'})
              </div>
              <div style={{ flex: 1 }}>
                <Editor
                  language={state.mode === 'parser' ? 'json' : 'xml'}
                  value={state.output}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    lineNumbers: 'on',
                    wordWrap: 'on',
                    automaticLayout: true,
                    scrollBeyondLastLine: false,
                    fontSize: 14
                  }}
                  theme="vs-dark"
                />
              </div>
            </div>
          </Allotment.Pane>
        </Allotment>
      </div>

      {/* Footer with info */}
      <div style={{ 
        padding: '0.5rem 1rem', 
        borderTop: '1px solid var(--ifm-color-emphasis-200)',
        backgroundColor: 'var(--ifm-background-color)',
        fontSize: '0.8rem',
        color: 'var(--ifm-color-emphasis-600)'
      }}>
        <strong>DDEX Suite v0.4.5</strong> - Using Firebase Functions API with ddex-parser and ddex-builder v0.4.5
        <br/>
        <strong>Features:</strong> Real-time parsing • Deterministic XML building •
        Preset configurations • Round-trip compatibility • Google Cloud Linux binaries • Cloud-powered performance
      </div>
    </div>
  );
}

export default function Playground() {
  return (
    <Layout title="Playground v0.4.5" description="Interactive DDEX Suite playground with v0.4.5 features and enhanced performance optimizations">
      <BrowserOnly fallback={<div>Loading playground...</div>}>
        {() => <PlaygroundComponent />}
      </BrowserOnly>
    </Layout>
  );
}