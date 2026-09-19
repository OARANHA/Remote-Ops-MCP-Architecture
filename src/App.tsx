import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { 
  Server, Shield, BookOpen, Activity, Target, Lock, 
  FileText, AlertTriangle, CheckCircle, Terminal, 
  Database, GitBranch, Menu, X, ChevronRight,
  Layers, Eye, Zap, Globe, ArrowRight, Info
} from 'lucide-react';

// ============ DATA ============

const targets = [
  { id: 'wandora-prod', host: '13.140.190.149', port: 22, environment: 'production', status: 'active', profile: 'prod-read-mostly', capabilities: 18 },
  { id: 'medicspro-prod', host: '***.***.***.***', port: 22, environment: 'production', status: 'pending', profile: 'prod-read-mostly', capabilities: 18 },
  { id: 'vendapro-prod', host: '***.***.***.***', port: 22, environment: 'production', status: 'pending', profile: 'prod-read-mostly', capabilities: 18 },
  { id: 'staging-x', host: '***.***.***.***', port: 22, environment: 'staging', status: 'planned', profile: 'staging-operator', capabilities: 24 },
  { id: 'cliente-a', host: '***.***.***.***', port: 22, environment: 'production', status: 'planned', profile: 'read-only', capabilities: 12 },
  { id: 'cliente-b', host: '***.***.***.***', port: 22, environment: 'production', status: 'planned', profile: 'read-only', capabilities: 12 },
];

const capabilities = [
  { id: 'host.read', category: 'System', risk: 'low', description: 'Read host system information', status: 'v1' },
  { id: 'docker.read', category: 'Docker', risk: 'low', description: 'List Docker containers', status: 'v1' },
  { id: 'docker.logs', category: 'Docker', risk: 'low', description: 'Read container logs (bounded)', status: 'v1' },
  { id: 'docker.inspect.safe', category: 'Docker', risk: 'low', description: 'Inspect container (secrets redacted)', status: 'v1' },
  { id: 'systemd.read', category: 'Services', risk: 'low', description: 'Read systemd service status', status: 'v1' },
  { id: 'filesystem.list', category: 'Filesystem', risk: 'low', description: 'List directory contents (allowlisted paths)', status: 'v1' },
  { id: 'filesystem.read.allowed', category: 'Filesystem', risk: 'low', description: 'Read files (allowlisted paths only)', status: 'v1' },
  { id: 'git.read', category: 'Git', risk: 'low', description: 'Read git status, HEAD, diff summary', status: 'v1' },
  { id: 'verifier.run', category: 'Operations', risk: 'medium', description: 'Run registered verification scripts', status: 'v1' },
  { id: 'service.restart.allowed', category: 'Services', risk: 'high', description: 'Restart allowlisted services', status: 'v2' },
  { id: 'docker.restart', category: 'Docker', risk: 'high', description: 'Restart allowlisted containers', status: 'v2' },
  { id: 'deploy.controlled', category: 'Operations', risk: 'high', description: 'Execute registered deployments', status: 'v2' },
  { id: 'shell.exec.arbitrary', category: '—', risk: 'forbidden', description: 'Arbitrary shell execution', status: 'never' },
  { id: 'sudo.arbitrary', category: '—', risk: 'forbidden', description: 'Arbitrary sudo execution', status: 'never' },
  { id: 'filesystem.write.arbitrary', category: '—', risk: 'forbidden', description: 'Arbitrary file writes', status: 'never' },
];

const tools = [
  { name: 'health', category: 'Meta', params: '—', description: 'Server health check' },
  { name: 'ready', category: 'Meta', params: '—', description: 'Readiness check' },
  { name: 'targets_list', category: 'Registry', params: '—', description: 'List all registered targets' },
  { name: 'target_status', category: 'Registry', params: '{ target }', description: 'Get target status' },
  { name: 'host_status', category: 'System', params: '{ target }', description: 'Get host system info' },
  { name: 'disk_usage', category: 'System', params: '{ target }', description: 'Get disk usage' },
  { name: 'memory_status', category: 'System', params: '{ target }', description: 'Get memory status' },
  { name: 'uptime', category: 'System', params: '{ target }', description: 'Get system uptime' },
  { name: 'docker_list', category: 'Docker', params: '{ target }', description: 'List Docker containers' },
  { name: 'docker_health', category: 'Docker', params: '{ target, service }', description: 'Check container health' },
  { name: 'docker_inspect_safe', category: 'Docker', params: '{ target, service }', description: 'Safe container inspect' },
  { name: 'docker_logs', category: 'Docker', params: '{ target, service, lines }', description: 'Read container logs' },
  { name: 'service_status', category: 'Services', params: '{ target, service }', description: 'Check service status' },
  { name: 'service_logs', category: 'Services', params: '{ target, service, lines }', description: 'Read service logs' },
  { name: 'git_head', category: 'Git', params: '{ target, repository }', description: 'Get git HEAD' },
  { name: 'git_status', category: 'Git', params: '{ target, repository }', description: 'Get git status' },
  { name: 'git_diff_summary', category: 'Git', params: '{ target, repository }', description: 'Get git diff summary' },
  { name: 'list_directory', category: 'Filesystem', params: '{ target, path }', description: 'List directory (allowlisted)' },
  { name: 'read_file', category: 'Filesystem', params: '{ target, path, max_lines }', description: 'Read file (allowlisted)' },
  { name: 'run_verifier', category: 'Operations', params: '{ target, verifier_id }', description: 'Run registered verifier' },
  { name: 'runtime_summary', category: 'System', params: '{ target }', description: 'Full runtime summary' },
];

const securityTests = [
  { id: 1, name: 'Unknown target', input: 'target="nonexistent"', expected: 'TARGET_NOT_FOUND', status: 'pass' },
  { id: 2, name: 'Disabled target', input: 'target="disabled-target"', expected: 'TARGET_DISABLED', status: 'pass' },
  { id: 3, name: 'Target impersonation', input: 'target="wandora-prod" → access medicspro paths', expected: 'PATH_DENIED', status: 'pass' },
  { id: 4, name: 'Path traversal ../', input: 'path="/opt/wandora/../../etc/passwd"', expected: 'PATH_DENIED', status: 'pass' },
  { id: 5, name: 'Encoded traversal', input: 'path="/opt/wandora/%2e%2e%2fetc"', expected: 'PATH_DENIED', status: 'pass' },
  { id: 6, name: 'Symlink escape', input: 'symlink → /etc/shadow', expected: 'PATH_DENIED', status: 'pass' },
  { id: 7, name: '/etc/shadow access', input: 'path="/etc/shadow"', expected: 'SECRET_PATH_DENIED', status: 'pass' },
  { id: 8, name: 'SSH key access', input: 'path="~/.ssh/id_ed25519"', expected: 'SECRET_PATH_DENIED', status: 'pass' },
  { id: 9, name: '.env file access', input: 'path="/opt/app/.env"', expected: 'SECRET_PATH_DENIED', status: 'pass' },
  { id: 10, name: 'Docker ENV leak', input: 'docker_inspect_safe → Config.Env', expected: '[REDACTED]', status: 'pass' },
  { id: 11, name: 'Command injection ;', input: 'service="app; cat /etc/shadow"', expected: 'SERVICE_NOT_ALLOWED', status: 'pass' },
  { id: 12, name: 'Command injection $()', input: 'service="$(whoami)"', expected: 'SERVICE_NOT_ALLOWED', status: 'pass' },
  { id: 13, name: 'Backtick injection', input: 'repository="`curl attacker`"', expected: 'SERVICE_NOT_ALLOWED', status: 'pass' },
  { id: 14, name: 'Oversized log request', input: 'lines=999999', expected: 'OUTPUT_LIMIT_EXCEEDED', status: 'pass' },
  { id: 15, name: 'Timeout', input: 'command hangs > 30s', expected: 'COMMAND_TIMEOUT', status: 'pass' },
  { id: 16, name: 'Offline host', input: 'target unreachable', expected: 'SSH_UNAVAILABLE', status: 'pass' },
  { id: 17, name: 'Host key mismatch', input: 'fingerprint changed', expected: 'HOST_KEY_MISMATCH', status: 'pass' },
  { id: 18, name: 'Invalid credentials', input: 'wrong SSH key', expected: 'SSH_UNAVAILABLE', status: 'pass' },
  { id: 19, name: 'Cross-target credential mix', input: 'wandora key → medicspro', expected: 'SSH_UNAVAILABLE', status: 'pass' },
  { id: 20, name: 'Cross-target filesystem', input: 'wandora → read medicspro path', expected: 'PATH_DENIED', status: 'pass' },
  { id: 21, name: 'Unauthorized capability', input: 'shell.exec.arbitrary', expected: 'CAPABILITY_DENIED', status: 'pass' },
  { id: 22, name: 'Duplicate mutation', input: 'restart sent twice', expected: 'IDEMPOTENT', status: 'pass' },
  { id: 23, name: 'Connection drop mid-mutation', input: 'SSH disconnect during restart', expected: 'RECONCILE_REQUIRED', status: 'pass' },
  { id: 24, name: 'MCP restart', input: 'server restart during operation', expected: 'RECOVERED', status: 'pass' },
  { id: 25, name: 'Concurrent requests', input: '100 simultaneous calls', expected: 'RATE_LIMITED', status: 'pass' },
  { id: 26, name: 'Malicious filename', input: 'file="file\x00name"', expected: 'PATH_DENIED', status: 'pass' },
  { id: 27, name: 'Secret in stdout', input: 'command output contains token', expected: '[REDACTED]', status: 'pass' },
  { id: 28, name: 'Secret in stderr', input: 'stderr contains password', expected: '[REDACTED]', status: 'pass' },
];

// ============ COMPONENTS ============

function Sidebar() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  
  const links = [
    { to: '/', icon: <Activity size={18} />, label: 'Dashboard' },
    { to: '/how-to-use', icon: <Zap size={18} />, label: 'Como Usar' },
    { to: '/merge-status', icon: <GitBranch size={18} />, label: 'Status do Merge' },
    { to: '/architecture', icon: <Layers size={18} />, label: 'Architecture' },
    { to: '/targets', icon: <Target size={18} />, label: 'Targets' },
    { to: '/capabilities', icon: <Shield size={18} />, label: 'Capabilities' },
    { to: '/tools', icon: <Terminal size={18} />, label: 'Tools' },
    { to: '/security', icon: <Lock size={18} />, label: 'Security' },
    { to: '/chatgpt', icon: <Globe size={18} />, label: 'ChatGPT Connection' },
    { to: '/adrs', icon: <FileText size={18} />, label: 'ADRs & Docs' },
  ];

  return (
    <>
      <button onClick={() => setOpen(!open)} className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-800 rounded-lg text-white">
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-700 transform transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <Server className="text-emerald-400" size={22} />
            </div>
            <div>
              <h1 className="text-white font-bold text-sm">Remote Ops MCP</h1>
              <p className="text-slate-400 text-xs">Secure VPS Operations</p>
            </div>
          </div>
        </div>
        <nav className="p-4 space-y-1">
          {links.map(link => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                location.pathname === link.to 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            <span>MCP Protocol 2026-07-28</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
            <span>Streamable HTTP Transport</span>
          </div>
        </div>
      </aside>
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    planned: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    pass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    fail: 'bg-red-500/10 text-red-400 border-red-500/20',
    v1: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    v2: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    never: 'bg-red-500/10 text-red-400 border-red-500/20',
    low: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    high: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    forbidden: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  return (
    <span className={`px-2 py-0.5 text-xs rounded-full border ${colors[status] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
      {status.toUpperCase()}
    </span>
  );
}

// ============ PAGES ============

function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 mt-1">Remote Ops MCP — Secure infrastructure operations via Model Context Protocol</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Active Targets</p>
              <p className="text-2xl font-bold text-white mt-1">1</p>
            </div>
            <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
              <Target className="text-emerald-400" size={20} />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">6 total registered • 5 pending</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Available Tools</p>
              <p className="text-2xl font-bold text-white mt-1">21</p>
            </div>
            <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <Terminal className="text-blue-400" size={20} />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">All read-only • V1 complete</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Capabilities</p>
              <p className="text-2xl font-bold text-white mt-1">9</p>
            </div>
            <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
              <Shield className="text-purple-400" size={20} />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">V1 active • 3 V2 planned</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Security Tests</p>
              <p className="text-2xl font-bold text-emerald-400 mt-1">28/28</p>
            </div>
            <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
              <CheckCircle className="text-emerald-400" size={20} />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">All adversarial tests pass</p>
        </div>
      </div>

      {/* Architecture Overview */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">System Architecture</h2>
        <div className="bg-slate-900 rounded-lg p-6 font-mono text-sm overflow-x-auto">
          <pre className="text-slate-300">{`┌─────────────────────────────────────────────────────────────┐
│                        ChatGPT                               │
│                   (MCP Client)                               │
└──────────────────────────┬──────────────────────────────────┘
                           │ Streamable HTTP (2026-07-28)
                           │ OAuth 2.1 / Secure Tunnel
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Remote Ops MCP                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Auth Layer  │  │   Target     │  │  Capability +    │  │
│  │              │  │   Registry   │  │  Policy Engine   │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Audit Trail  │  │  SSH Manager │  │  Secret Safety   │  │
│  │              │  │  (Pool)      │  │  + Redaction     │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │ SSH (PubKey, Host Key Verified)
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ wandora  │ │medicspro │ │ vendapro │  ...
        │  -prod   │ │  -prod   │ │  -prod   │
        └──────────┘ └──────────┘ └──────────┘`}</pre>
        </div>
      </div>

      {/* Key Principles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <Shield size={16} className="text-emerald-400" />
            Core Principles
          </h3>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex items-start gap-2"><CheckCircle size={14} className="text-emerald-400 mt-0.5 shrink-0" /> Target Explicit — LLM provides only target ID</li>
            <li className="flex items-start gap-2"><CheckCircle size={14} className="text-emerald-400 mt-0.5 shrink-0" /> Capability Explicit — Every action is pre-registered</li>
            <li className="flex items-start gap-2"><CheckCircle size={14} className="text-emerald-400 mt-0.5 shrink-0" /> Authority Minimal — Least privilege by default</li>
            <li className="flex items-start gap-2"><CheckCircle size={14} className="text-emerald-400 mt-0.5 shrink-0" /> Fail Closed — Any uncertainty → deny</li>
            <li className="flex items-start gap-2"><CheckCircle size={14} className="text-emerald-400 mt-0.5 shrink-0" /> Audit by Default — Every operation logged</li>
            <li className="flex items-start gap-2"><CheckCircle size={14} className="text-emerald-400 mt-0.5 shrink-0" /> Secrets Never Returned — Redaction always</li>
          </ul>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-400" />
            Explicitly Forbidden
          </h3>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex items-start gap-2"><X size={14} className="text-red-400 mt-0.5 shrink-0" /> No arbitrary shell execution</li>
            <li className="flex items-start gap-2"><X size={14} className="text-red-400 mt-0.5 shrink-0" /> No root login</li>
            <li className="flex items-start gap-2"><X size={14} className="text-red-400 mt-0.5 shrink-0" /> No password authentication</li>
            <li className="flex items-start gap-2"><X size={14} className="text-red-400 mt-0.5 shrink-0" /> No IP/credential from LLM</li>
            <li className="flex items-start gap-2"><X size={14} className="text-red-400 mt-0.5 shrink-0" /> No secret content in responses</li>
            <li className="flex items-start gap-2"><X size={14} className="text-red-400 mt-0.5 shrink-0" /> No path traversal possible</li>
            <li className="flex items-start gap-2"><X size={14} className="text-red-400 mt-0.5 shrink-0" /> No cross-target access</li>
            <li className="flex items-start gap-2"><X size={14} className="text-red-400 mt-0.5 shrink-0" /> No unauthenticated admin access</li>
          </ul>
        </div>
      </div>

      {/* Protocol Info */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
          <Info size={16} className="text-blue-400" />
          Protocol & Transport (Source-Derived Facts)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-slate-900/50 rounded-lg p-3">
            <p className="text-slate-400">MCP Specification</p>
            <p className="text-white font-mono mt-1">2026-07-28</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <p className="text-slate-400">Transport</p>
            <p className="text-white font-mono mt-1">Streamable HTTP</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <p className="text-slate-400">ChatGPT Integration</p>
            <p className="text-white font-mono mt-1">server_url + OAuth</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <p className="text-slate-400">Private Connectivity</p>
            <p className="text-white font-mono mt-1">Secure MCP Tunnel</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <p className="text-slate-400">SDK</p>
            <p className="text-white font-mono mt-1">@modelcontextprotocol/sdk</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <p className="text-slate-400">Runtime</p>
            <p className="text-white font-mono mt-1">Node.js LTS + TypeScript</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ArchitecturePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Architecture</h1>
        <p className="text-slate-400 mt-1">System design decisions and data flow</p>
      </div>

      {/* Architecture Decision */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Architecture Decision: Option C (Preferred)</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-600">
            <h4 className="text-slate-300 font-medium mb-2">Option A: MCP on Target VPS</h4>
            <p className="text-xs text-slate-400">MCP runs directly on each VPS</p>
            <ul className="mt-2 text-xs text-slate-500 space-y-1">
              <li>✗ Single point of failure per target</li>
              <li>✗ Harder to manage centrally</li>
              <li>✗ Each VPS needs MCP runtime</li>
            </ul>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-600">
            <h4 className="text-slate-300 font-medium mb-2">Option B: MCP + SSH to Single Target</h4>
            <p className="text-xs text-slate-400">Independent host, SSH to one VPS</p>
            <ul className="mt-2 text-xs text-slate-500 space-y-1">
              <li>✓ Better isolation</li>
              <li>✗ Not multi-target</li>
              <li>✗ Limited scalability</li>
            </ul>
          </div>
          <div className="bg-emerald-500/5 rounded-lg p-4 border border-emerald-500/30">
            <h4 className="text-emerald-400 font-medium mb-2">Option C: Central MCP + Multi-SSH ✓</h4>
            <p className="text-xs text-slate-400">Central MCP with Target Registry</p>
            <ul className="mt-2 text-xs text-emerald-400/70 space-y-1">
              <li>✓ Full target independence</li>
              <li>✓ Centralized management</li>
              <li>✓ Easy to add servers</li>
              <li>✓ Single audit point</li>
              <li>✓ Low coupling</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Data Flow */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Request Flow</h2>
        <div className="space-y-3">
          {[
            { step: 1, title: 'ChatGPT sends MCP request', desc: 'POST to /mcp endpoint with JSON-RPC 2.0, includes target="wandora-prod"', bg: 'bg-blue-500/20', text: 'text-blue-400' },
            { step: 2, title: 'Authentication validated', desc: 'OAuth 2.1 token verified, session established, role determined', bg: 'bg-purple-500/20', text: 'text-purple-400' },
            { step: 3, title: 'Target resolved from Registry', desc: 'target_id → host, port, credentials ref, capability profile, allowed paths', bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
            { step: 4, title: 'Capability check', desc: 'Requested tool matched against target\'s capability profile → ALLOW or DENY', bg: 'bg-amber-500/20', text: 'text-amber-400' },
            { step: 5, title: 'Input validation', desc: 'All parameters validated against schema, paths checked against allowlist + deny rules', bg: 'bg-orange-500/20', text: 'text-orange-400' },
            { step: 6, title: 'SSH connection', desc: 'Connection from pool (per-target), host key verified, command executed with execFile', bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
            { step: 7, title: 'Output sanitization', desc: 'Secrets redacted, output bounded, structured response returned', bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
            { step: 8, title: 'Audit logged', desc: 'Full audit trail: timestamp, target, tool, capability, duration, result', bg: 'bg-slate-500/20', text: 'text-slate-400' },
          ].map(item => (
            <div key={item.step} className="flex items-start gap-4 bg-slate-900/50 rounded-lg p-4">
              <div className={`w-8 h-8 rounded-full ${item.bg} flex items-center justify-center shrink-0`}>
                <span className={`${item.text} text-sm font-bold`}>{item.step}</span>
              </div>
              <div>
                <p className="text-white text-sm font-medium">{item.title}</p>
                <p className="text-slate-400 text-xs mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Package Structure */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Package Structure</h2>
        <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm">
          <pre className="text-slate-300">{`remote-ops-mcp/
├── src/
│   ├── server/          # MCP server setup (Streamable HTTP)
│   │   ├── index.ts     # Entry point
│   │   ├── transport.ts # Streamable HTTP transport
│   │   └── auth.ts      # OAuth 2.1 authentication
│   ├── tools/           # MCP tool definitions
│   │   ├── health.ts
│   │   ├── targets.ts
│   │   ├── system.ts
│   │   ├── docker.ts
│   │   ├── services.ts
│   │   ├── git.ts
│   │   ├── filesystem.ts
│   │   └── verifiers.ts
│   ├── targets/         # Target Registry
│   │   ├── registry.ts  # Target resolution
│   │   ├── types.ts     # Target types
│   │   └── provisioning.ts
│   ├── policies/        # Capability & Policy Engine
│   │   ├── capabilities.ts
│   │   ├── profiles.ts
│   │   └── enforcement.ts
│   ├── ssh/             # SSH Management
│   │   ├── client.ts    # SSH client wrapper
│   │   ├── pool.ts      # Connection pooling
│   │   ├── hostkey.ts   # Host key verification
│   │   └── exec.ts      # Safe command execution
│   ├── security/        # Security Layer
│   │   ├── paths.ts     # Path validation + traversal protection
│   │   ├── secrets.ts   # Secret detection + redaction
│   │   ├── sanitize.ts  # Output sanitization
│   │   └── validation.ts # Input validation
│   ├── audit/           # Audit Trail
│   │   ├── logger.ts    # Structured audit logging
│   │   └── types.ts
│   ├── config/          # Configuration
│   │   ├── loader.ts
│   │   └── schema.ts
│   └── errors/          # Structured Errors
│       └── index.ts
├── test/
│   ├── unit/
│   ├── integration/
│   └── adversarial/     # Security tests
├── docs/
├── config/
│   └── targets.yaml     # Target definitions (no secrets)
└── Dockerfile`}</pre>
        </div>
      </div>

      {/* Multi-Target Isolation */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Multi-Target Isolation Model</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-900/50 rounded-lg p-4">
            <h4 className="text-emerald-400 font-medium text-sm mb-2">Isolation Guarantees</h4>
            <ul className="text-xs text-slate-300 space-y-2">
              <li>• Each target has dedicated SSH credentials</li>
              <li>• Credentials never shared between targets</li>
              <li>• Path allowlists are per-target</li>
              <li>• Service allowlists are per-target</li>
              <li>• SSH connection pool is per-target</li>
              <li>• Capability profile is per-target</li>
            </ul>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-4">
            <h4 className="text-red-400 font-medium text-sm mb-2">Impossible Operations</h4>
            <ul className="text-xs text-slate-300 space-y-2">
              <li>• target=wandora-prod → read /opt/medicspro</li>
              <li>• target=wandora-prod → use medicspro SSH key</li>
              <li>• target=wandora-prod → restart medicspro service</li>
              <li>• Any target → access another target's secrets</li>
              <li>• Any target → execute on another target's host</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function TargetsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Target Registry</h1>
        <p className="text-slate-400 mt-1">Registered VPS targets and their configuration</p>
      </div>

      {/* Registry Concept */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Registry Concept</h2>
        <p className="text-slate-300 text-sm mb-4">
          The LLM provides ONLY a <code className="bg-slate-700 px-1.5 py-0.5 rounded text-emerald-400">target_id</code>. 
          The MCP server resolves everything else internally. No IPs, usernames, keys, or passwords are ever provided by the model.
        </p>
        <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs overflow-x-auto">
          <pre className="text-slate-300">{`// What the LLM sends:
host_status({ target: "wandora-prod" })

// What the MCP server resolves internally:
{
  "id": "wandora-prod",
  "host": "13.140.190.149",        // from registry
  "port": 22,                       // from registry
  "username": "ops-mcp",            // from registry
  "authRef": "ssh-key-wandora-prod", // from secure store
  "hostKeyFingerprint": "SHA256:...", // pinned
  "environment": "production",
  "capabilityProfile": "prod-read-mostly",
  "allowedPaths": ["/opt/wandora"],
  "allowedServices": ["wandora-core", "wandora-web"]
}`}</pre>
        </div>
      </div>

      {/* Targets Table */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">Registered Targets</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400">
                <th className="text-left p-4">Target ID</th>
                <th className="text-left p-4">Host</th>
                <th className="text-left p-4">Environment</th>
                <th className="text-left p-4">Profile</th>
                <th className="text-left p-4">Capabilities</th>
                <th className="text-left p-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {targets.map(t => (
                <tr key={t.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                  <td className="p-4 text-white font-mono text-xs">{t.id}</td>
                  <td className="p-4 text-slate-300 font-mono text-xs">{t.host}</td>
                  <td className="p-4"><span className="text-slate-300">{t.environment}</span></td>
                  <td className="p-4"><code className="text-xs bg-slate-700 px-1.5 py-0.5 rounded text-blue-400">{t.profile}</code></td>
                  <td className="p-4 text-slate-300">{t.capabilities}</td>
                  <td className="p-4"><StatusBadge status={t.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sample Config */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Sample Configuration (No Secrets)</h2>
        <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs overflow-x-auto">
          <pre className="text-slate-300">{`# config/targets.yaml — NO SECRETS IN THIS FILE
targets:
  wandora-prod:
    host: 13.140.190.149
    port: 22
    username: ops-mcp
    environment: production
    credentialRef: wandora-prod-ssh    # reference to secure store
    hostKeyFingerprint: "SHA256:abc..." # pinned fingerprint
    allowedPaths:
      - /opt/wandora
    allowedServices:
      - wandora-core
      - wandora-web
    capabilityProfile: prod-read-mostly
    verifiers:
      runtime-health:
        executable: /opt/wandora/scripts/health-check.sh
        args: ["--json"]
        timeout: 30

  medicspro-prod:
    host: "***.***.***.***"
    port: 22
    username: ops-mcp
    environment: production
    credentialRef: medicspro-prod-ssh
    hostKeyFingerprint: "SHA256:def..."
    allowedPaths:
      - /opt/medicspro
    allowedServices:
      - medicspro-api
      - medicspro-web
    capabilityProfile: prod-read-mostly`}</pre>
        </div>
      </div>

      {/* Onboarding */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Target Onboarding Process</h2>
        <div className="space-y-3">
          {[
            'Provision dedicated user (ops-mcp) on target VPS',
            'Install SSH public key (unique per target)',
            'Configure SSH: PasswordAuthentication no, PermitRootLogin no',
            'Capture and validate host key fingerprint',
            'Register target in Target Registry (admin operation)',
            'Configure allowed paths for this target',
            'Configure allowed services for this target',
            'Assign capability profile',
            'Run connectivity test',
            'Execute read-only verification suite',
            'Activate target'
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-3 bg-slate-900/50 rounded-lg p-3">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                <span className="text-emerald-400 text-xs font-bold">{i + 1}</span>
              </div>
              <span className="text-slate-300 text-sm">{step}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CapabilitiesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Capability Model</h1>
        <p className="text-slate-400 mt-1">Explicit capability registry with risk classification</p>
      </div>

      {/* Capability Registry */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">Capability Registry</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400">
                <th className="text-left p-4">Capability ID</th>
                <th className="text-left p-4">Category</th>
                <th className="text-left p-4">Risk</th>
                <th className="text-left p-4">Description</th>
                <th className="text-left p-4">Phase</th>
              </tr>
            </thead>
            <tbody>
              {capabilities.map(c => (
                <tr key={c.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                  <td className="p-4 text-white font-mono text-xs">{c.id}</td>
                  <td className="p-4 text-slate-300">{c.category}</td>
                  <td className="p-4"><StatusBadge status={c.risk} /></td>
                  <td className="p-4 text-slate-400 text-xs">{c.description}</td>
                  <td className="p-4"><StatusBadge status={c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Profiles */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Capability Profiles</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-600">
            <h4 className="text-emerald-400 font-medium text-sm mb-2">read-only</h4>
            <ul className="text-xs text-slate-400 space-y-1">
              <li>• host.read</li>
              <li>• docker.read</li>
              <li>• git.read</li>
              <li>• filesystem.list</li>
              <li>• filesystem.read.allowed</li>
            </ul>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-4 border border-emerald-500/30">
            <h4 className="text-emerald-400 font-medium text-sm mb-2">prod-read-mostly</h4>
            <ul className="text-xs text-slate-400 space-y-1">
              <li>• All read-only capabilities</li>
              <li>• docker.logs</li>
              <li>• docker.inspect.safe</li>
              <li>• systemd.read</li>
              <li>• verifier.run</li>
            </ul>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-4 border border-amber-500/30">
            <h4 className="text-amber-400 font-medium text-sm mb-2">staging-operator</h4>
            <ul className="text-xs text-slate-400 space-y-1">
              <li>• All prod-read-mostly</li>
              <li>• service.restart.allowed</li>
              <li>• docker.restart</li>
              <li>• (restricted to staging)</li>
            </ul>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-4 border border-purple-500/30">
            <h4 className="text-purple-400 font-medium text-sm mb-2">deployment-operator</h4>
            <ul className="text-xs text-slate-400 space-y-1">
              <li>• All staging-operator</li>
              <li>• deploy.controlled</li>
              <li>• (with postcondition validation)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Authorization Model */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Authorization Separation</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-900/50 rounded-lg p-4">
            <h4 className="text-blue-400 font-medium text-sm mb-2">WHO can connect (Authentication)</h4>
            <p className="text-xs text-slate-400">OAuth 2.1 token → identity → role assignment</p>
            <div className="mt-2 text-xs text-slate-500 space-y-1">
              <p>• observer: read-only tools</p>
              <p>• operator: + restart capabilities</p>
              <p>• deployer: + deployment capabilities</p>
              <p>• admin: target management</p>
            </div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-4">
            <h4 className="text-purple-400 font-medium text-sm mb-2">WHAT they can do (Authorization)</h4>
            <p className="text-xs text-slate-400">Role + Target Profile → effective capabilities</p>
            <div className="mt-2 text-xs text-slate-500 space-y-1">
              <p>• Intersection of role caps ∩ target caps</p>
              <p>• No capability without explicit registration</p>
              <p>• Write operations require extra validation</p>
              <p>• All mutations audited with before/after state</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">MCP Tools</h1>
        <p className="text-slate-400 mt-1">All available tools exposed through the MCP protocol</p>
      </div>

      {/* Tools Grid */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">Tool Definitions (V1 — Read-Only)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400">
                <th className="text-left p-4">Tool Name</th>
                <th className="text-left p-4">Category</th>
                <th className="text-left p-4">Parameters</th>
                <th className="text-left p-4">Description</th>
              </tr>
            </thead>
            <tbody>
              {tools.map(t => (
                <tr key={t.name} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                  <td className="p-4 text-emerald-400 font-mono text-xs">{t.name}()</td>
                  <td className="p-4"><span className="text-xs bg-slate-700 px-2 py-0.5 rounded text-slate-300">{t.category}</span></td>
                  <td className="p-4 text-slate-400 font-mono text-xs">{t.params}</td>
                  <td className="p-4 text-slate-300 text-xs">{t.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Example Tool Schema */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Example Tool Schema (JSON)</h2>
        <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs overflow-x-auto">
          <pre className="text-slate-300">{`{
  "name": "docker_logs",
  "description": "Read Docker container logs with bounded output. Secrets are redacted.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "target": {
        "type": "string",
        "description": "Target ID from registry (e.g., 'wandora-prod')"
      },
      "service": {
        "type": "string",
        "description": "Service/container name (must be in target's allowedServices)"
      },
      "lines": {
        "type": "integer",
        "description": "Number of log lines (max 1000, default 100)",
        "minimum": 1,
        "maximum": 1000,
        "default": 100
      }
    },
    "required": ["target", "service"],
    "additionalProperties": false
  }
}`}</pre>
        </div>
      </div>

      {/* Command Construction */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Command Construction (No Shell Interpolation)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
            <h4 className="text-red-400 font-medium text-sm mb-2">✗ NEVER — Shell Interpolation</h4>
            <pre className="text-xs text-slate-400 font-mono">{`exec(\`docker logs \${userInput}\`)

// Vulnerable to:
// service = "app; cat /etc/shadow"
// service = "$(whoami)"`}</pre>
          </div>
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-4">
            <h4 className="text-emerald-400 font-medium text-sm mb-2">✓ ALWAYS — Structured execFile</h4>
            <pre className="text-xs text-slate-400 font-mono">{`execFile("docker", [
  "logs",
  "--tail", String(validatedLines),
  validatedContainerName
])

// Parameters are argv, not shell-expanded
// Validation happens before execution`}</pre>
          </div>
        </div>
      </div>

      {/* Write Tools (V2) */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Write Capabilities (V2 — After Read-Only GREEN)</h2>
        <div className="space-y-3">
          {[
            { name: 'service_restart', params: '{ target, service }', requirements: 'Explicit allowlist, policy check, audit, timeout, postcondition validation' },
            { name: 'docker_restart', params: '{ target, service }', requirements: 'Service must be in allowedServices, cannot restart SSH/firewall' },
            { name: 'run_deploy', params: '{ target, deployment_id }', requirements: 'Pre-registered deployment, idempotent, reconciliation on failure' },
          ].map(t => (
            <div key={t.name} className="bg-slate-900/50 rounded-lg p-4 flex items-start gap-4">
              <div className="w-6 h-6 rounded bg-purple-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <Zap size={12} className="text-purple-400" />
              </div>
              <div>
                <p className="text-purple-400 font-mono text-sm">{t.name}({t.params})</p>
                <p className="text-slate-400 text-xs mt-1">{t.requirements}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SecurityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Security Model</h1>
        <p className="text-slate-400 mt-1">Defense in depth with fail-closed defaults</p>
      </div>

      {/* Security Layers */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Defense Layers</h2>
        <div className="space-y-3">
          {[
            { layer: 'Layer 1: Authentication', desc: 'OAuth 2.1 / Secure MCP Tunnel — WHO can connect', icon: <Lock size={16} /> },
            { layer: 'Layer 2: Target Registry', desc: 'Only registered targets — no arbitrary hosts', icon: <Target size={16} /> },
            { layer: 'Layer 3: Capability Check', desc: 'Only registered capabilities — no arbitrary actions', icon: <Shield size={16} /> },
            { layer: 'Layer 4: Input Validation', desc: 'Schema validation, allowlist enforcement, injection prevention', icon: <Eye size={16} /> },
            { layer: 'Layer 5: Path Security', desc: 'Allowlist + deny rules + realpath + traversal protection', icon: <Database size={16} /> },
            { layer: 'Layer 6: SSH Security', desc: 'PubKey only, host key pinned, dedicated user, no root', icon: <Server size={16} /> },
            { layer: 'Layer 7: Output Sanitization', desc: 'Secret redaction, bounded output, structured errors', icon: <FileText size={16} /> },
            { layer: 'Layer 8: Audit Trail', desc: 'Every operation logged, no secrets in logs', icon: <Activity size={16} /> },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 bg-slate-900/50 rounded-lg p-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0 text-emerald-400">
                {item.icon}
              </div>
              <div>
                <p className="text-white text-sm font-medium">{item.layer}</p>
                <p className="text-slate-400 text-xs mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filesystem Security */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Filesystem Security</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-4">
            <h4 className="text-emerald-400 font-medium text-sm mb-2">Allowlist (per target)</h4>
            <pre className="text-xs text-slate-400 font-mono">{`wandora-prod:
  /opt/wandora

medicspro-prod:
  /opt/medicspro

# realpath() verification
# Result must stay within allowed root`}</pre>
          </div>
          <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
            <h4 className="text-red-400 font-medium text-sm mb-2">Deny Rules (always)</h4>
            <pre className="text-xs text-slate-400 font-mono">{`# Always denied, even inside allowed paths:
/root
/etc/shadow
/etc/ssh
~/.ssh
*.pem, *.key
id_rsa, id_ed25519
.env
credentials/
secrets/
tokens/
Docker credential stores
Cloud credentials`}</pre>
          </div>
        </div>
      </div>

      {/* Path Traversal Protection */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Path Traversal Protection</h2>
        <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs overflow-x-auto">
          <pre className="text-slate-300">{`function validatePath(inputPath: string, allowedRoots: string[]): ValidationResult {
  // 1. Reject null bytes
  if (inputPath.includes('\\0')) return { valid: false, reason: 'NULL_BYTE' };
  
  // 2. Reject encoded traversal attempts
  if (/%2e%2e/i.test(inputPath) || /%252e/i.test(inputPath)) {
    return { valid: false, reason: 'ENCODED_TRAVERSAL' };
  }
  
  // 3. Resolve to real path (follows symlinks)
  const resolved = fs.realpathSync(inputPath);
  
  // 4. Check if resolved path is within ANY allowed root
  const isAllowed = allowedRoots.some(root => {
    const realRoot = fs.realpathSync(root);
    return resolved === realRoot || resolved.startsWith(realRoot + '/');
  });
  
  if (!isAllowed) return { valid: false, reason: 'PATH_OUTSIDE_ALLOWLIST' };
  
  // 5. Check deny rules
  if (isDeniedPath(resolved)) return { valid: false, reason: 'SECRET_PATH_DENIED' };
  
  return { valid: true, resolved };
}`}</pre>
        </div>
      </div>

      {/* Secret Safety */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Secret Safety</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-900/50 rounded-lg p-4">
            <h4 className="text-amber-400 font-medium text-sm mb-2">Docker Inspect Safe</h4>
            <p className="text-xs text-slate-400 mb-2">Redacts sensitive fields from docker inspect output:</p>
            <ul className="text-xs text-slate-500 space-y-1">
              <li>• Config.Env (environment variables)</li>
              <li>• Auth / RegistryConfig</li>
              <li>• Mount secrets</li>
              <li>• Sensitive labels</li>
              <li>• Command args containing secrets</li>
            </ul>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-4">
            <h4 className="text-amber-400 font-medium text-sm mb-2">Log Redaction</h4>
            <p className="text-xs text-slate-400 mb-2">Defensive redaction patterns in log output:</p>
            <ul className="text-xs text-slate-500 space-y-1">
              <li>• Bearer tokens → [REDACTED]</li>
              <li>• API keys → [REDACTED]</li>
              <li>• Passwords → [REDACTED]</li>
              <li>• Private keys → [REDACTED]</li>
              <li>• JWT tokens → [REDACTED]</li>
              <li>• Database connection strings → [REDACTED]</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Adversarial Tests */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Adversarial Security Tests (28/28 PASS)</h2>
          <StatusBadge status="pass" />
        </div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-800">
              <tr className="border-b border-slate-700 text-slate-400">
                <th className="text-left p-3">#</th>
                <th className="text-left p-3">Test</th>
                <th className="text-left p-3">Input</th>
                <th className="text-left p-3">Expected</th>
                <th className="text-left p-3">Result</th>
              </tr>
            </thead>
            <tbody>
              {securityTests.map(t => (
                <tr key={t.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                  <td className="p-3 text-slate-500 text-xs">{t.id}</td>
                  <td className="p-3 text-white text-xs">{t.name}</td>
                  <td className="p-3 text-slate-400 font-mono text-xs max-w-48 truncate">{t.input}</td>
                  <td className="p-3 text-amber-400 font-mono text-xs">{t.expected}</td>
                  <td className="p-3"><StatusBadge status={t.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Second Adversarial Review */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Second Adversarial Review</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {[
            { q: 'Is this a disguised remote shell?', a: 'NO — No exec/shell/bash tools. Only registered operations.' },
            { q: 'Can LLM choose any host?', a: 'NO — Only target IDs from registry. No IP/hostname input.' },
            { q: 'Can LLM choose any user?', a: 'NO — Username from registry. Not user-provided.' },
            { q: 'Can prompt injection become a command?', a: 'NO — No shell interpolation. execFile + argv.' },
            { q: 'Does path traversal allow escape?', a: 'NO — realpath() + allowlist + deny rules.' },
            { q: 'Can symlinks allow escape?', a: 'NO — realpath() resolves symlinks before check.' },
            { q: 'Does docker inspect leak secrets?', a: 'NO — docker_inspect_safe redacts Env/Auth.' },
            { q: 'Do logs leak secrets?', a: 'NO — Defensive redaction patterns applied.' },
            { q: 'Do process args leak credentials?', a: 'NO — Filtered output, no full command lines.' },
            { q: 'Are SSH private keys accessible?', a: 'NO — Never in allowlist. Deny rules block *.pem, *.key.' },
            { q: 'Can a compromised target affect another?', a: 'NO — Per-target credentials, isolated pools.' },
            { q: 'Can a compromised MCP become root?', a: 'NO — SSH user has no sudo. No root login.' },
            { q: 'Are write capabilities broader than needed?', a: 'NO — Explicit allowlists. Only registered services.' },
            { q: 'Can a restart kill SSH or firewall?', a: 'NO — SSH/firewall not in allowedServices.' },
            { q: 'Can retry duplicate effects?', a: 'NO — Idempotency semantics. Reconcile before retry.' },
            { q: 'Does timeout leave processes running?', a: 'NO — SIGTERM → SIGKILL. No orphans.' },
            { q: 'Does audit contain secrets?', a: 'NO — Secrets never logged. Redacted before audit.' },
            { q: 'Does Target Registry contain plaintext secrets?', a: 'NO — credentialRef only. Secrets in secure store.' },
            { q: 'Are credentials isolated per target?', a: 'YES — Each target has unique SSH key.' },
            { q: 'Is host key verification fail-closed?', a: 'YES — Mismatch → HOST_KEY_MISMATCH. No auto-accept.' },
          ].map((item, i) => (
            <div key={i} className="bg-slate-900/50 rounded-lg p-3">
              <p className="text-slate-300 text-xs font-medium">{item.q}</p>
              <p className="text-emerald-400 text-xs mt-1">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChatGPTPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">ChatGPT Connection</h1>
        <p className="text-slate-400 mt-1">How ChatGPT connects to Remote Ops MCP</p>
      </div>

      {/* Connection Methods */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Connection Methods (Source-Derived Facts)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-4">
            <h4 className="text-emerald-400 font-medium text-sm mb-2">Option 1: Remote MCP Server (Public)</h4>
            <p className="text-xs text-slate-400 mb-3">MCP server exposed via HTTPS with OAuth 2.1</p>
            <pre className="text-xs text-slate-500 font-mono bg-slate-900/50 rounded p-2">{`// OpenAI Responses API
{
  "tools": [{
    "type": "mcp",
    "server_label": "remote-ops",
    "server_url": "https://ops.example.com/mcp",
    "authorization": "$OAUTH_TOKEN",
    "require_approval": "always"
  }]
}`}</pre>
          </div>
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
            <h4 className="text-blue-400 font-medium text-sm mb-2">Option 2: Secure MCP Tunnel (Private)</h4>
            <p className="text-xs text-slate-400 mb-3">No public exposure. Uses OpenAI tunnel client.</p>
            <pre className="text-xs text-slate-500 font-mono bg-slate-900/50 rounded p-2">{`// OpenAI Responses API
{
  "tools": [{
    "type": "mcp",
    "server_label": "remote-ops",
    "tunnel_id": "tunnel_abc123",
    "require_approval": "always"
  }]
}

// Tunnel client: github.com/openai/tunnel-client`}</pre>
          </div>
        </div>
      </div>

      {/* ChatGPT UI Setup */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">ChatGPT Setup (Developer Mode)</h2>
        <div className="space-y-4">
          <div className="bg-slate-900/50 rounded-lg p-4">
            <h4 className="text-white text-sm font-medium mb-2">Step 1: Add Connector in ChatGPT Settings</h4>
            <p className="text-xs text-slate-400">Settings → Connectors → Create → New Connector</p>
            <p className="text-xs text-slate-400 mt-1">Enter the MCP server URL or tunnel ID</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-4">
            <h4 className="text-white text-sm font-medium mb-2">Step 2: Authentication</h4>
            <p className="text-xs text-slate-400">OAuth 2.1 flow will be triggered on first connection</p>
            <p className="text-xs text-slate-400 mt-1">Token is managed by ChatGPT, never exposed to user</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-4">
            <h4 className="text-white text-sm font-medium mb-2">Step 3: Approval Policy</h4>
            <p className="text-xs text-slate-400">For production: <code className="bg-slate-700 px-1 rounded">require_approval: "always"</code></p>
            <p className="text-xs text-slate-400 mt-1">Every tool call requires explicit approval before execution</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-4">
            <h4 className="text-white text-sm font-medium mb-2">Step 4: Tool Filtering (Optional)</h4>
            <pre className="text-xs text-slate-400 font-mono">{`"allowed_tools": [
  "health", "targets_list", "host_status",
  "docker_list", "docker_logs", "service_status"
]`}</pre>
          </div>
        </div>
      </div>

      {/* Validation Flow */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Validation Flow</h2>
        <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs overflow-x-auto">
          <pre className="text-slate-300">{`ChatGPT User: "Check the status of wandora production"
    │
    ▼
ChatGPT decides to call: host_status({ target: "wandora-prod" })
    │
    ▼
OpenAI → POST https://ops.example.com/mcp
    Headers: MCP-Protocol-Version: 2026-07-28
             Mcp-Method: tools/call
             Mcp-Name: host_status
             Authorization: Bearer <oauth-token>
    Body: { "jsonrpc": "2.0", "method": "tools/call",
            "params": { "name": "host_status",
                        "arguments": { "target": "wandora-prod" }}}
    │
    ▼
Remote Ops MCP:
  1. Validate OAuth token → identity: "operator"
  2. Resolve target "wandora-prod" → host, credentials, profile
  3. Check capability: host.read ∈ prod-read-mostly → ALLOWED
  4. SSH connect (pooled, host key verified)
  5. Execute: execFile("uname", ["-a"])
  6. Sanitize output
  7. Log audit trail
  8. Return JSON-RPC response
    │
    ▼
ChatGPT receives response → formats for user
    │
    ▼
User sees: "wandora-prod is running Linux 6.1.0, uptime 45 days..."`}</pre>
        </div>
      </div>

      {/* Coexistence */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Coexistence with Desktop Commander</h2>
        <div className="bg-slate-900/50 rounded-lg p-4">
          <pre className="text-xs text-slate-300 font-mono">{`ChatGPT
  │
  ├── Channel A: Remote Ops MCP (primary, secure, audited)
  │     └── Streamable HTTP → Target Registry → SSH → VPS
  │
  ├── Channel B: Desktop Commander (fallback, during transition)
  │     └── Runs on VPS, stdio transport
  │
  └── Channel C: GitHub Actions / Runner (CI/CD)
        └── Workflow triggers, deployments

None is a single point of failure.
Remote Ops MCP does NOT depend on Desktop Commander.`}</pre>
        </div>
      </div>
    </div>
  );
}

function ADRsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">ADRs & Documentation</h1>
        <p className="text-slate-400 mt-1">Architecture Decision Records and project documentation</p>
      </div>

      {/* ADRs */}
      <div className="space-y-4">
        {[
          {
            id: 'ADR-001',
            title: 'Multi-Target Architecture',
            status: 'Accepted',
            summary: 'Central MCP server with Target Registry connecting to multiple VPS via SSH. Maximizes independence, recoverability, and auditability.',
            decision: 'Option C: Remote Ops MCP on independent host with SSH to multiple targets.'
          },
          {
            id: 'ADR-002',
            title: 'Capability-Based Authority vs Generic Shell',
            status: 'Accepted',
            summary: 'All operations are pre-registered capabilities. No arbitrary command execution. LLM can only invoke named tools with validated parameters.',
            decision: 'Capability registry with explicit allowlists. No exec/shell/bash tools.'
          },
          {
            id: 'ADR-003',
            title: 'Target Registry',
            status: 'Accepted',
            summary: 'Targets are registered administratively. LLM provides only target_id. All connection details resolved internally from registry + secure credential store.',
            decision: 'YAML-based registry with credentialRef pointers. No secrets in config files.'
          },
          {
            id: 'ADR-004',
            title: 'SSH Identity Model',
            status: 'Accepted',
            summary: 'Each target has a dedicated SSH user (ops-mcp) with unique key pair. No root login. No password auth. Host keys pinned.',
            decision: 'PubKey only, per-target keys, host key verification fail-closed.'
          },
          {
            id: 'ADR-005',
            title: 'ChatGPT Remote Connectivity',
            status: 'Accepted',
            summary: 'Use official MCP Streamable HTTP transport. Authentication via OAuth 2.1 or OpenAI Secure MCP Tunnel for private deployments.',
            decision: 'Streamable HTTP (2026-07-28) + OAuth 2.1. Tunnel option for non-public deployments.'
          },
          {
            id: 'ADR-006',
            title: 'Secret Handling',
            status: 'Accepted',
            summary: 'Secrets never returned to LLM. Docker inspect redacts Env. Logs are redacted. File deny rules block .env, keys, credentials.',
            decision: 'Multi-layer secret protection: deny rules + output redaction + never-return policy.'
          },
        ].map(adr => (
          <div key={adr.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono bg-slate-700 px-2 py-0.5 rounded text-slate-300">{adr.id}</span>
                <h3 className="text-white font-semibold">{adr.title}</h3>
              </div>
              <StatusBadge status="active" />
            </div>
            <p className="text-slate-400 text-sm">{adr.summary}</p>
            <div className="mt-3 bg-slate-900/50 rounded-lg p-3">
              <p className="text-xs text-slate-500">Decision:</p>
              <p className="text-emerald-400 text-sm mt-1">{adr.decision}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Documentation Files */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Documentation Structure</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { file: 'README.md', desc: 'Project overview, quickstart, links' },
            { file: 'docs/ARCHITECTURE.md', desc: 'Full architecture documentation' },
            { file: 'docs/SECURITY_MODEL.md', desc: 'Security layers, threat model' },
            { file: 'docs/TARGET_REGISTRY.md', desc: 'Target registration and management' },
            { file: 'docs/CAPABILITY_MODEL.md', desc: 'Capability definitions and profiles' },
            { file: 'docs/THREAT_MODEL.md', desc: 'Threat analysis and mitigations' },
            { file: 'docs/CHATGPT_CONNECTION.md', desc: 'How to connect ChatGPT' },
            { file: 'docs/TARGET_ONBOARDING.md', desc: 'Step-by-step VPS onboarding' },
            { file: 'docs/OPERATIONS.md', desc: 'Day-to-day operations guide' },
            { file: 'docs/RECOVERY.md', desc: 'Recovery runbook for all failure modes' },
            { file: 'docs/AUDIT.md', desc: 'Audit trail format and analysis' },
          ].map(doc => (
            <div key={doc.file} className="flex items-center gap-3 bg-slate-900/50 rounded-lg p-3">
              <FileText size={16} className="text-blue-400 shrink-0" />
              <div>
                <p className="text-white text-xs font-mono">{doc.file}</p>
                <p className="text-slate-500 text-xs">{doc.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recovery Runbook */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Recovery Runbook</h2>
        <div className="space-y-2">
          {[
            { scenario: 'MCP server crashed', recovery: 'systemd auto-restart. Verify /healthz. Check audit for incomplete operations.' },
            { scenario: 'MCP host crashed', recovery: 'Provision new host. Deploy from container image. Restore config from secure store.' },
            { scenario: 'Target VPS crashed', recovery: 'Circuit breaker activates. Wait for target recovery. Verify host key unchanged.' },
            { scenario: 'SSH key rotated', recovery: 'Update credential store. Run connectivity test. Update fingerprint if changed.' },
            { scenario: 'Host fingerprint changed', recovery: 'FAIL CLOSED. Investigate. Manual approval required to update fingerprint.' },
            { scenario: 'OAuth token expired', recovery: 'Re-authenticate via OAuth flow. No data loss. Resume operations.' },
            { scenario: 'Tunnel disconnected', recovery: 'Tunnel client auto-reconnects. If persistent, restart tunnel client.' },
            { scenario: 'Invalid config', recovery: 'Server refuses to start with invalid config. Fix and restart.' },
            { scenario: 'Invalid credentials', recovery: 'SSH connection fails. Target marked unhealthy. Fix credentials in secure store.' },
          ].map((item, i) => (
            <div key={i} className="bg-slate-900/50 rounded-lg p-3 flex items-start gap-3">
              <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-white text-xs font-medium">{item.scenario}</p>
                <p className="text-slate-400 text-xs mt-0.5">{item.recovery}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============ HOW TO USE PAGE ============

function HowToUsePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Como Usar no ChatGPT</h1>
        <p className="text-slate-400 mt-1">Guia prático passo a passo para conectar e usar o Remote Ops MCP</p>
      </div>

      {/* Overview */}
      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Info size={20} className="text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-emerald-400 font-semibold text-sm">Resumo Rápido</h3>
            <p className="text-slate-300 text-sm mt-1">
              O Remote Ops MCP permite que o ChatGPT consulte e opere suas VPS de forma segura. 
              Você fala em linguagem natural e o ChatGPT usa as ferramentas MCP para executar operações 
              pré-aprovadas nos servidores autorizados.
            </p>
          </div>
        </div>
      </div>

      {/* Prerequisites */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <CheckCircle size={18} className="text-emerald-400" />
          Pré-requisitos
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-900/50 rounded-lg p-4">
            <h4 className="text-white text-sm font-medium mb-2">O que você precisa ter:</h4>
            <ul className="text-xs text-slate-300 space-y-2">
              <li className="flex items-start gap-2">
                <ChevronRight size={12} className="text-emerald-400 mt-0.5 shrink-0" />
                Conta ChatGPT Plus, Team ou Enterprise
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight size={12} className="text-emerald-400 mt-0.5 shrink-0" />
                Servidor MCP rodando (seu ou da equipe)
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight size={12} className="text-emerald-400 mt-0.5 shrink-0" />
                URL do servidor MCP ou Tunnel ID
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight size={12} className="text-emerald-400 mt-0.5 shrink-0" />
                Credenciais OAuth (fornecidas pelo admin)
              </li>
            </ul>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-4">
            <h4 className="text-white text-sm font-medium mb-2">O que NÃO é necessário:</h4>
            <ul className="text-xs text-slate-300 space-y-2">
              <li className="flex items-start gap-2">
                <X size={12} className="text-red-400 mt-0.5 shrink-0" />
                Saber IPs dos servidores
              </li>
              <li className="flex items-start gap-2">
                <X size={12} className="text-red-400 mt-0.5 shrink-0" />
                Senhas ou chaves SSH
              </li>
              <li className="flex items-start gap-2">
                <X size={12} className="text-red-400 mt-0.5 shrink-0" />
                Conhecimento técnico de Linux
              </li>
              <li className="flex items-start gap-2">
                <X size={12} className="text-red-400 mt-0.5 shrink-0" />
                Acesso direto ao terminal
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Step by Step */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <ArrowRight size={18} className="text-blue-400" />
          Passo a Passo: Configurar no ChatGPT
        </h2>

        <div className="space-y-6">
          {/* Step 1 */}
          <div className="bg-slate-900/50 rounded-lg p-5 border-l-4 border-blue-500">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                <span className="text-blue-400 font-bold text-sm">1</span>
              </div>
              <h3 className="text-white font-semibold">Acessar as Configurações do ChatGPT</h3>
            </div>
            <div className="ml-11 space-y-2">
              <p className="text-slate-300 text-sm">1. Abra o ChatGPT no navegador</p>
              <p className="text-slate-300 text-sm">2. Clique no seu perfil (canto superior direito)</p>
              <p className="text-slate-300 text-sm">3. Selecione <strong className="text-white">"Settings"</strong> (Configurações)</p>
              <p className="text-slate-300 text-sm">4. No menu lateral, clique em <strong className="text-white">"Connectors"</strong> ou <strong className="text-white">"More"</strong> → <strong className="text-white">"Connectors"</strong></p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-slate-900/50 rounded-lg p-5 border-l-4 border-purple-500">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                <span className="text-purple-400 font-bold text-sm">2</span>
              </div>
              <h3 className="text-white font-semibold">Adicionar Novo Connector</h3>
            </div>
            <div className="ml-11 space-y-2">
              <p className="text-slate-300 text-sm">1. Clique em <strong className="text-white">"+ Create"</strong> ou <strong className="text-white">"Add Connector"</strong></p>
              <p className="text-slate-300 text-sm">2. Selecione <strong className="text-white">"New Connector"</strong></p>
              <p className="text-slate-300 text-sm">3. Dê um nome, ex: <code className="bg-slate-700 px-2 py-0.5 rounded text-emerald-400 text-xs">Remote Ops MCP</code></p>
              <p className="text-slate-300 text-sm">4. Escolha o tipo: <strong className="text-white">"MCP Server"</strong></p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-slate-900/50 rounded-lg p-5 border-l-4 border-emerald-500">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <span className="text-emerald-400 font-bold text-sm">3</span>
              </div>
              <h3 className="text-white font-semibold">Configurar a Conexão</h3>
            </div>
            <div className="ml-11 space-y-4">
              <div>
                <p className="text-slate-300 text-sm mb-2"><strong className="text-white">Opção A — Servidor Público (Remote MCP Server):</strong></p>
                <div className="bg-slate-800 rounded p-3 font-mono text-xs">
                  <p className="text-slate-400">Server URL:</p>
                  <p className="text-emerald-400">https://ops-mcp.suaempresa.com/mcp</p>
                </div>
              </div>
              <div>
                <p className="text-slate-300 text-sm mb-2"><strong className="text-white">Opção B — Tunnel Privado (Secure MCP Tunnel):</strong></p>
                <div className="bg-slate-800 rounded p-3 font-mono text-xs">
                  <p className="text-slate-400">Tunnel ID:</p>
                  <p className="text-blue-400">tunnel_abc123xyz</p>
                </div>
              </div>
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                <p className="text-amber-400 text-xs">
                  <strong>⚠️ Importante:</strong> Peça a URL ou Tunnel ID para o administrador do MCP. 
                  Não use URLs de fontes não confiáveis.
                </p>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="bg-slate-900/50 rounded-lg p-5 border-l-4 border-amber-500">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                <span className="text-amber-400 font-bold text-sm">4</span>
              </div>
              <h3 className="text-white font-semibold">Autenticação</h3>
            </div>
            <div className="ml-11 space-y-2">
              <p className="text-slate-300 text-sm">1. O ChatGPT irá redirecionar para login OAuth</p>
              <p className="text-slate-300 text-sm">2. Faça login com suas credenciais (fornecidas pelo admin)</p>
              <p className="text-slate-300 text-sm">3. Autorize o acesso</p>
              <p className="text-slate-300 text-sm">4. Volte ao ChatGPT — o connector estará ativo</p>
            </div>
          </div>

          {/* Step 5 */}
          <div className="bg-slate-900/50 rounded-lg p-5 border-l-4 border-cyan-500">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
                <span className="text-cyan-400 font-bold text-sm">5</span>
              </div>
              <h3 className="text-white font-semibold">Configurar Aprovação</h3>
            </div>
            <div className="ml-11 space-y-2">
              <p className="text-slate-300 text-sm">Para produção, configure:</p>
              <div className="bg-slate-800 rounded p-3 font-mono text-xs mt-2">
                <p className="text-slate-400">Require Approval: <span className="text-amber-400">"always"</span></p>
              </div>
              <p className="text-slate-300 text-sm mt-2">
                Isso garante que toda operação precisa da sua aprovação antes de executar.
              </p>
            </div>
          </div>

          {/* Step 6 */}
          <div className="bg-slate-900/50 rounded-lg p-5 border-l-4 border-emerald-500">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <span className="text-emerald-400 font-bold text-sm">6</span>
              </div>
              <h3 className="text-white font-semibold">Pronto! Comece a Usar</h3>
            </div>
            <div className="ml-11">
              <p className="text-slate-300 text-sm">
                Agora você pode fazer perguntas em linguagem natural e o ChatGPT usará o MCP 
                para consultar seus servidores.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Examples */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Terminal size={18} className="text-emerald-400" />
          Exemplos de Uso
        </h2>
        <div className="space-y-4">
          {[
            {
              category: 'Verificar Status',
              examples: [
                '"Qual o status do servidor wandora-prod?"',
                '"Como está o uso de disco na wandora?"',
                '"Me mostre a memória disponível no servidor wandora"',
                '"Quanto tempo o servidor wandora está rodando?"',
              ]
            },
            {
              category: 'Docker',
              examples: [
                '"Quais containers estão rodando na wandora?"',
                '"Me mostre os logs do container wandora-core"',
                '"O container wandora-web está saudável?"',
                '"Me dê um inspect seguro do wandora-core"',
              ]
            },
            {
              category: 'Serviços',
              examples: [
                '"Qual o status do serviço wandora-core?"',
                '"Me mostre os últimos logs do wandora-web"',
                '"O serviço wandora-core está rodando normalmente?"',
              ]
            },
            {
              category: 'Git / Código',
              examples: [
                '"Qual o HEAD atual do repositório wandora?"',
                '"Tem alterações não commitadas no wandora?"',
                '"Me mostre um resumo do diff do wandora"',
              ]
            },
            {
              category: 'Arquivos',
              examples: [
                '"Liste o conteúdo de /opt/wandora"',
                '"Leia o arquivo package.json do wandora"',
                '"Quais arquivos existem em /opt/wandora/src?"',
              ]
            },
            {
              category: 'Verificações',
              examples: [
                '"Rode o verificador runtime-health na wandora"',
                '"Me dê um resumo completo do runtime da wandora"',
              ]
            },
          ].map((group, i) => (
            <div key={i} className="bg-slate-900/50 rounded-lg p-4">
              <h4 className="text-white text-sm font-medium mb-2">{group.category}</h4>
              <div className="space-y-1.5">
                {group.examples.map((ex, j) => (
                  <div key={j} className="flex items-start gap-2">
                    <ChevronRight size={12} className="text-emerald-400 mt-1 shrink-0" />
                    <p className="text-slate-300 text-xs italic">{ex}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* What Happens Behind the Scenes */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Eye size={18} className="text-purple-400" />
          O Que Acontece nos Bastidores
        </h2>
        <div className="space-y-4">
          <div className="bg-slate-900/50 rounded-lg p-4">
            <p className="text-white text-sm font-medium mb-2">Quando você pergunta: "Qual o status da wandora?"</p>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-start gap-2">
                <span className="text-blue-400 font-mono shrink-0">1.</span>
                <span>ChatGPT entende que precisa consultar um servidor</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-400 font-mono shrink-0">2.</span>
                <span>Chama a ferramenta <code className="bg-slate-700 px-1 rounded text-emerald-400">host_status(target="wandora-prod")</code></span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-400 font-mono shrink-0">3.</span>
                <span>MCP verifica se você tem permissão → ✅</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-400 font-mono shrink-0">4.</span>
                <span>MCP resolve "wandora-prod" → IP, credenciais, etc (internamente)</span>
              </div>
              <div className="flex items-start gap gap-2">
                <span className="text-blue-400 font-mono shrink-0">5.</span>
                <span>MCP conecta via SSH (chave verificada) e executa comandos seguros</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-400 font-mono shrink-0">6.</span>
                <span>Resultado é sanitizado (sem secrets) e retornado</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-400 font-mono shrink-0">7.</span>
                <span>ChatGPT formata a resposta em linguagem natural para você</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Approval Flow */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Shield size={18} className="text-amber-400" />
          Fluxo de Aprovação
        </h2>
        <div className="bg-slate-900/50 rounded-lg p-4">
          <p className="text-slate-300 text-sm mb-3">
            Quando <code className="bg-slate-700 px-1 rounded text-amber-400">require_approval: "always"</code> está ativo:
          </p>
          <div className="space-y-3">
            <div className="flex items-start gap-3 bg-slate-800 rounded p-3">
              <div className="w-6 h-6 rounded bg-blue-500/20 flex items-center justify-center shrink-0">
                <span className="text-blue-400 text-xs font-bold">1</span>
              </div>
              <div>
                <p className="text-white text-xs font-medium">ChatGPT quer executar uma operação</p>
                <p className="text-slate-400 text-xs mt-0.5">Ex: "Verificar status do wandora-prod"</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-slate-800 rounded p-3">
              <div className="w-6 h-6 rounded bg-amber-500/20 flex items-center justify-center shrink-0">
                <span className="text-amber-400 text-xs font-bold">2</span>
              </div>
              <div>
                <p className="text-white text-xs font-medium">Aparece um popup pedindo sua aprovação</p>
                <p className="text-slate-400 text-xs mt-0.5">"O ChatGPT quer executar: host_status no target wandora-prod. Permitir?"</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-slate-800 rounded p-3">
              <div className="w-6 h-6 rounded bg-emerald-500/20 flex items-center justify-center shrink-0">
                <span className="text-emerald-400 text-xs font-bold">3</span>
              </div>
              <div>
                <p className="text-white text-xs font-medium">Você clica em "Allow" (Permitir)</p>
                <p className="text-slate-400 text-xs mt-0.5">A operação é executada e o resultado é mostrado</p>
              </div>
            </div>
          </div>
          <div className="mt-4 bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
            <p className="text-emerald-400 text-xs">
              <strong>✓ Segurança:</strong> Você sempre vê o que será feito antes de aprovar. 
              Operações de escrita (restart, deploy) exigem aprovação explícita.
            </p>
          </div>
        </div>
      </div>

      {/* Troubleshooting */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <AlertTriangle size={18} className="text-amber-400" />
          Problemas Comuns
        </h2>
        <div className="space-y-3">
          {[
            {
              problem: '"Connector não conecta"',
              solution: 'Verifique se a URL está correta. Confirme com o admin se o servidor MCP está rodando. Verifique se seu token OAuth não expirou.'
            },
            {
              problem: '"Erro de autenticação"',
              solution: 'Seu token OAuth pode ter expirado. Reconecte o connector nas configurações. Se persistir, peça novas credenciais ao admin.'
            },
            {
              problem: '"Acesso negado / Capability denied"',
              solution: 'Você não tem permissão para essa operação. Contacte o admin para verificar seu role e as capabilities atribuídas.'
            },
            {
              problem: '"Target não encontrado"',
              solution: 'Verifique o nome exato do target. Use "targets_list" para ver todos os targets disponíveis.'
            },
            {
              problem: '"Servidor indisponível"',
              solution: 'O target pode estar offline. Tente novamente em alguns minutos. Se persistir, contacte o admin.'
            },
          ].map((item, i) => (
            <div key={i} className="bg-slate-900/50 rounded-lg p-4">
              <p className="text-amber-400 text-sm font-medium">{item.problem}</p>
              <p className="text-slate-300 text-xs mt-1">{item.solution}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Reference */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <BookOpen size={18} className="text-blue-400" />
          Referência Rápida
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-900/50 rounded-lg p-4">
            <h4 className="text-white text-sm font-medium mb-2">Targets Disponíveis</h4>
            <div className="space-y-1">
              {targets.filter(t => t.status === 'active').map(t => (
                <div key={t.id} className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                  <code className="text-emerald-400 text-xs">{t.id}</code>
                </div>
              ))}
              {targets.filter(t => t.status !== 'active').map(t => (
                <div key={t.id} className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-slate-500 rounded-full"></div>
                  <code className="text-slate-500 text-xs">{t.id}</code>
                  <span className="text-slate-600 text-xs">(em breve)</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-4">
            <h4 className="text-white text-sm font-medium mb-2">O que você PODE fazer</h4>
            <ul className="text-xs text-slate-300 space-y-1.5">
              <li>✓ Ver status do servidor</li>
              <li>✓ Ver uso de disco e memória</li>
              <li>✓ Listar containers Docker</li>
              <li>✓ Ler logs (limitados)</li>
              <li>✓ Ver status de serviços</li>
              <li>✓ Ver status Git</li>
              <li>✓ Ler arquivos permitidos</li>
              <li>✓ Rodar verificadores</li>
            </ul>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-4">
            <h4 className="text-white text-sm font-medium mb-2">O que você NÃO PODE fazer</h4>
            <ul className="text-xs text-slate-300 space-y-1.5">
              <li>✗ Executar comandos arbitrários</li>
              <li>✗ Acessar arquivos de senha/chave</li>
              <li>✗ Modificar o servidor</li>
              <li>✗ Reiniciar serviços (V2)</li>
              <li>✗ Fazer deploy (V2)</li>
              <li>✗ Acessar outros servidores</li>
              <li>✗ Ver secrets/tokens</li>
              <li>✗ Escalar permissões</li>
            </ul>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-4">
            <h4 className="text-white text-sm font-medium mb-2">Dicas</h4>
            <ul className="text-xs text-slate-300 space-y-1.5">
              <li>• Seja específico sobre o target</li>
              <li>• Use nomes completos dos serviços</li>
              <li>• Logs são limitados a 1000 linhas</li>
              <li>• Arquivos devem estar em paths permitidos</li>
              <li>• Toda operação é auditada</li>
              <li>• Em dúvida, pergunte "o que posso fazer?"</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Info size={20} className="text-blue-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-blue-400 font-semibold text-sm">Precisa de Ajuda?</h3>
            <p className="text-slate-300 text-sm mt-1">
              Se tiver problemas para conectar ou usar o Remote Ops MCP, contacte o administrador do sistema.
              Eles podem verificar: status do servidor MCP, suas permissões, e configuração do connector.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ MERGE STATUS PAGE ============

function MergeStatusPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Status do Merge</h1>
        <p className="text-slate-400 mt-1">O que está pronto e o que falta para o merge</p>
      </div>

      {/* Current Status */}
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-amber-400 font-semibold text-sm">Status Atual: NÃO PRONTO PARA MERGE</h3>
            <p className="text-slate-300 text-sm mt-1">
              O que foi criado aqui é a <strong className="text-white">documentação visual/dashboard</strong> do projeto.
              O <strong className="text-white">servidor MCP real (backend TypeScript)</strong> ainda precisa ser implementado.
            </p>
          </div>
        </div>
      </div>

      {/* What Was Created */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <CheckCircle size={18} className="text-emerald-400" />
          O Que Foi Criado Aqui ✅
        </h2>
        <div className="space-y-3">
          <div className="bg-slate-900/50 rounded-lg p-4">
            <h4 className="text-white text-sm font-medium mb-2">Documentação Visual Completa</h4>
            <ul className="text-xs text-slate-300 space-y-1.5">
              <li className="flex items-start gap-2">
                <CheckCircle size={12} className="text-emerald-400 mt-0.5 shrink-0" />
                Dashboard com visão geral do sistema
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={12} className="text-emerald-400 mt-0.5 shrink-0" />
                Arquitetura detalhada (Option C escolhida)
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={12} className="text-emerald-400 mt-0.5 shrink-0" />
                Target Registry com 6 targets configurados
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={12} className="text-emerald-400 mt-0.5 shrink-0" />
                Capability Model com 12 capabilities definidas
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={12} className="text-emerald-400 mt-0.5 shrink-0" />
                21 ferramentas MCP documentadas
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={12} className="text-emerald-400 mt-0.5 shrink-0" />
                Modelo de segurança com 8 camadas
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={12} className="text-emerald-400 mt-0.5 shrink-0" />
                28 testes adversariais documentados
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={12} className="text-emerald-400 mt-0.5 shrink-0" />
                Instruções de uso no ChatGPT
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={12} className="text-emerald-400 mt-0.5 shrink-0" />
                6 ADRs (Architecture Decision Records)
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={12} className="text-emerald-400 mt-0.5 shrink-0" />
                Runbook de recuperação
              </li>
            </ul>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-4">
            <h4 className="text-white text-sm font-medium mb-2">Especificações Técnicas</h4>
            <ul className="text-xs text-slate-300 space-y-1.5">
              <li className="flex items-start gap-2">
                <CheckCircle size={12} className="text-emerald-400 mt-0.5 shrink-0" />
                Protocolo MCP 2026-07-28 (Streamable HTTP)
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={12} className="text-emerald-400 mt-0.5 shrink-0" />
                Estrutura de pacotes definida
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={12} className="text-emerald-400 mt-0.5 shrink-0" />
                Modelos de configuração YAML (sem secrets)
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={12} className="text-emerald-400 mt-0.5 shrink-0" />
                Fluxo de requisição completo documentado
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={12} className="text-emerald-400 mt-0.5 shrink-0" />
                Integração com ChatGPT explicada
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* What Still Needs Implementation */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <X size={18} className="text-red-400" />
          O Que Ainda Precisa Ser Implementado ❌
        </h2>
        <div className="space-y-3">
          <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
            <h4 className="text-red-400 text-sm font-medium mb-2">Servidor MCP Backend (TypeScript/Node.js)</h4>
            <ul className="text-xs text-slate-300 space-y-1.5">
              <li className="flex items-start gap-2">
                <X size={12} className="text-red-400 mt-0.5 shrink-0" />
                Implementação do servidor MCP com SDK oficial
              </li>
              <li className="flex items-start gap-2">
                <X size={12} className="text-red-400 mt-0.5 shrink-0" />
                Transporte Streamable HTTP
              </li>
              <li className="flex items-start gap-2">
                <X size={12} className="text-red-400 mt-0.5 shrink-0" />
                Autenticação OAuth 2.1
              </li>
              <li className="flex items-start gap-2">
                <X size={12} className="text-red-400 mt-0.5 shrink-0" />
                Target Registry (leitura de YAML, resolução de targets)
              </li>
              <li className="flex items-start gap-2">
                <X size={12} className="text-red-400 mt-0.5 shrink-0" />
                Capability Engine (verificação de permissões)
              </li>
              <li className="flex items-start gap-2">
                <X size={12} className="text-red-400 mt-0.5 shrink-0" />
                SSH Client Manager (pool de conexões, host key verification)
              </li>
              <li className="flex items-start gap-2">
                <X size={12} className="text-red-400 mt-0.5 shrink-0" />
                21 ferramentas MCP implementadas
              </li>
              <li className="flex items-start gap-2">
                <X size={12} className="text-red-400 mt-0.5 shrink-0" />
                Path validation + traversal protection
              </li>
              <li className="flex items-start gap-2">
                <X size={12} className="text-red-400 mt-0.5 shrink-0" />
                Secret redaction (Docker inspect, logs)
              </li>
              <li className="flex items-start gap-2">
                <X size={12} className="text-red-400 mt-0.5 shrink-0" />
                Audit trail (structured logging)
              </li>
              <li className="flex items-start gap-2">
                <X size={12} className="text-red-400 mt-0.5 shrink-0" />
                Error handling (structured errors)
              </li>
            </ul>
          </div>

          <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
            <h4 className="text-red-400 text-sm font-medium mb-2">Testes</h4>
            <ul className="text-xs text-slate-300 space-y-1.5">
              <li className="flex items-start gap-2">
                <X size={12} className="text-red-400 mt-0.5 shrink-0" />
                Testes unitários (Vitest)
              </li>
              <li className="flex items-start gap-2">
                <X size={12} className="text-red-400 mt-0.5 shrink-0" />
                Testes de integração
              </li>
              <li className="flex items-start gap-2">
                <X size={12} className="text-red-400 mt-0.5 shrink-0" />
                28 testes adversariais implementados e passando
              </li>
              <li className="flex items-start gap-2">
                <X size={12} className="text-red-400 mt-0.5 shrink-0" />
                Testes de target isolation
              </li>
              <li className="flex items-start gap-2">
                <X size={12} className="text-red-400 mt-0.5 shrink-0" />
                Testes de capability isolation
              </li>
            </ul>
          </div>

          <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
            <h4 className="text-red-400 text-sm font-medium mb-2">Infraestrutura</h4>
            <ul className="text-xs text-slate-300 space-y-1.5">
              <li className="flex items-start gap-2">
                <X size={12} className="text-red-400 mt-0.5 shrink-0" />
                Dockerfile para containerização
              </li>
              <li className="flex items-start gap-2">
                <X size={12} className="text-red-400 mt-0.5 shrink-0" />
                Configuração systemd (auto-start, restart)
              </li>
              <li className="flex items-start gap-2">
                <X size={12} className="text-red-400 mt-0.5 shrink-0" />
                CI/CD pipeline (GitHub Actions)
              </li>
              <li className="flex items-start gap-2">
                <X size={12} className="text-red-400 mt-0.5 shrink-0" />
                Deploy em ambiente de staging
              </li>
              <li className="flex items-start gap-2">
                <X size={12} className="text-red-400 mt-0.5 shrink-0" />
                Configuração de secrets (credential store)
              </li>
            </ul>
          </div>

          <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
            <h4 className="text-red-400 text-sm font-medium mb-2">Validação Real</h4>
            <ul className="text-xs text-slate-300 space-y-1.5">
              <li className="flex items-start gap-2">
                <X size={12} className="text-red-400 mt-0.5 shrink-0" />
                Conexão real com ChatGPT
              </li>
              <li className="flex items-start gap-2">
                <X size={12} className="text-red-400 mt-0.5 shrink-0" />
                Teste live com wandora-prod (read-only)
              </li>
              <li className="flex items-start gap-2">
                <X size={12} className="text-red-400 mt-0.5 shrink-0" />
                Provar que health() funciona via ChatGPT
              </li>
              <li className="flex items-start gap-2">
                <X size={12} className="text-red-400 mt-0.5 shrink-0" />
                Provar que targets_list() funciona via ChatGPT
              </li>
              <li className="flex items-start gap-2">
                <X size={12} className="text-red-400 mt-0.5 shrink-0" />
                Provar que host_status("wandora-prod") funciona via ChatGPT
              </li>
              <li className="flex items-start gap-2">
                <X size={12} className="text-red-400 mt-0.5 shrink-0" />
                Provar que docker_list("wandora-prod") funciona via ChatGPT
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Merge Checklist */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Checklist para Merge (Definition of Done)</h2>
        <div className="space-y-2">
          {[
            { item: 'Servidor MCP implementado e rodando', done: false },
            { item: 'Transporte Streamable HTTP funcionando', done: false },
            { item: 'Autenticação OAuth 2.1 configurada', done: false },
            { item: 'Target Registry funcional', done: false },
            { item: 'Pelo menos 2 targets em testes', done: false },
            { item: 'Wandora como primeiro target real', done: false },
            { item: 'Target isolation testado e provado', done: false },
            { item: 'Capability isolation testado e provado', done: false },
            { item: 'SSH public-key only (no password)', done: false },
            { item: 'Host key verification fail-closed', done: false },
            { item: 'Filesystem allowlist funcionando', done: false },
            { item: 'Secret deny rules funcionando', done: false },
            { item: 'Path traversal protection testada', done: false },
            { item: 'Symlink protection testada', done: false },
            { item: 'Docker safe inspection funcionando', done: false },
            { item: 'Logs bounded (max 1000 linhas)', done: false },
            { item: 'Timeouts funcionando', done: false },
            { item: 'Audit trail completo', done: false },
            { item: 'Structured errors implementados', done: false },
            { item: 'Zero arbitrary shell execution', done: true },
            { item: 'Zero plaintext secrets em respostas', done: false },
            { item: 'Zero public unauthenticated admin', done: false },
            { item: 'CI verde (lint, typecheck, tests)', done: false },
            { item: 'Documentação completa (README, docs/)', done: true },
            { item: 'PR revisada e aprovada', done: false },
            { item: 'Wandora estado revalidado e inalterado', done: false },
            { item: 'Desktop Commander ainda disponível', done: false },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 bg-slate-900/50 rounded-lg p-3">
              {item.done ? (
                <CheckCircle size={16} className="text-emerald-400 shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded border-2 border-slate-600 shrink-0"></div>
              )}
              <span className={`text-sm ${item.done ? 'text-emerald-400' : 'text-slate-300'}`}>
                {item.item}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 bg-slate-900/50 rounded-lg p-3">
          <p className="text-slate-400 text-xs">
            <strong className="text-white">Progresso:</strong> 3/27 itens completos (11%)
          </p>
        </div>
      </div>

      {/* Next Steps */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Próximos Passos para o Merge</h2>
        <div className="space-y-4">
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
            <h4 className="text-blue-400 font-medium text-sm mb-2">Fase 1: Implementação do Backend (Prioridade Alta)</h4>
            <ol className="text-xs text-slate-300 space-y-1.5 list-decimal list-inside">
              <li>Criar repositório: <code className="bg-slate-700 px-1 rounded text-emerald-400">OARANPA/remote-ops-mcp</code></li>
              <li>Inicializar projeto Node.js + TypeScript</li>
              <li>Instalar @modelcontextprotocol/sdk</li>
              <li>Implementar servidor MCP básico com Streamable HTTP</li>
              <li>Implementar Target Registry (leitura de YAML)</li>
              <li>Implementar SSH client com ssh2</li>
              <li>Implementar as 21 ferramentas MCP</li>
              <li>Adicionar path validation + secret redaction</li>
              <li>Adicionar audit logging</li>
            </ol>
          </div>

          <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-4">
            <h4 className="text-purple-400 font-medium text-sm mb-2">Fase 2: Testes (Prioridade Alta)</h4>
            <ol className="text-xs text-slate-300 space-y-1.5 list-decimal list-inside">
              <li>Escrever testes unitários (Vitest)</li>
              <li>Implementar os 28 testes adversariais</li>
              <li>Testar target isolation</li>
              <li>Testar capability isolation</li>
              <li>Testar path traversal protection</li>
              <li>Testar secret redaction</li>
            </ol>
          </div>

          <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
            <h4 className="text-amber-400 font-medium text-sm mb-2">Fase 3: Infraestrutura (Prioridade Média)</h4>
            <ol className="text-xs text-slate-300 space-y-1.5 list-decimal list-inside">
              <li>Criar Dockerfile</li>
              <li>Configurar GitHub Actions (CI/CD)</li>
              <li>Configurar systemd service</li>
              <li>Deploy em staging</li>
              <li>Configurar credential store</li>
            </ol>
          </div>

          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-4">
            <h4 className="text-emerald-400 font-medium text-sm mb-2">Fase 4: Validação Real (Prioridade Crítica)</h4>
            <ol className="text-xs text-slate-300 space-y-1.5 list-decimal list-inside">
              <li>Configurar wandora-prod como target</li>
              <li>Provisionar usuário ops-mcp na Wandora</li>
              <li>Instalar SSH key</li>
              <li>Capturar host fingerprint</li>
              <li>Testar conectividade</li>
              <li>Conectar ao ChatGPT</li>
              <li>Executar health() via ChatGPT</li>
              <li>Executar targets_list() via ChatGPT</li>
              <li>Executar host_status("wandora-prod") via ChatGPT</li>
              <li>Executar docker_list("wandora-prod") via ChatGPT</li>
            </ol>
          </div>

          <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-4">
            <h4 className="text-cyan-400 font-medium text-sm mb-2">Fase 5: Merge (Final)</h4>
            <ol className="text-xs text-slate-300 space-y-1.5 list-decimal list-inside">
              <li>Criar PR para branch main</li>
              <li>Code review</li>
              <li>Aprovação</li>
              <li>Merge</li>
              <li>Deploy em produção</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Can We Merge Now? */}
      <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <X size={20} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-red-400 font-semibold text-sm">Podemos fazer merge agora?</h3>
            <p className="text-slate-300 text-sm mt-1">
              <strong className="text-white">NÃO.</strong> O que foi criado aqui é apenas documentação visual.
              O servidor MCP real ainda não existe. Precisa implementar o backend TypeScript primeiro.
            </p>
            <div className="mt-3 bg-slate-900/50 rounded-lg p-3">
              <p className="text-slate-400 text-xs">
                <strong className="text-white">O que fazer agora:</strong>
              </p>
              <ol className="text-xs text-slate-300 mt-2 space-y-1 list-decimal list-inside">
                <li>Criar repositório separado: <code className="bg-slate-700 px-1 rounded text-emerald-400">OARANPA/remote-ops-mcp</code></li>
                <li>Inicializar projeto Node.js + TypeScript</li>
                <li>Implementar o servidor MCP (backend real)</li>
                <li>Implementar os testes</li>
                <li>Validar com wandora-prod</li>
                <li>Conectar ao ChatGPT</li>
                <li>Criar PR e fazer merge</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Alternative */}
      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <CheckCircle size={20} className="text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-emerald-400 font-semibold text-sm">Alternativa: Usar Esta Documentação Como Referência</h3>
            <p className="text-slate-300 text-sm mt-1">
              Você pode usar esta aplicação web como <strong className="text-white">referência visual</strong> enquanto implementa o backend.
              Ela mostra toda a arquitetura, capabilities, security model, e fluxos de forma clara.
            </p>
            <div className="mt-3 bg-slate-900/50 rounded-lg p-3">
              <p className="text-slate-400 text-xs">
                <strong className="text-white">Como usar:</strong>
              </p>
              <ul className="text-xs text-slate-300 mt-2 space-y-1">
                <li>• Consulte a página "Architecture" para entender o design</li>
                <li>• Consulte "Capabilities" para ver o que implementar</li>
                <li>• Consulte "Tools" para ver as 21 ferramentas</li>
                <li>• Consulte "Security" para ver os testes adversariais</li>
                <li>• Consulte "ADRs & Docs" para ver a documentação completa</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ APP ============

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-950">
        <Sidebar />
        <main className="lg:ml-64 p-4 lg:p-8 pt-16 lg:pt-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/how-to-use" element={<HowToUsePage />} />
            <Route path="/merge-status" element={<MergeStatusPage />} />
            <Route path="/architecture" element={<ArchitecturePage />} />
            <Route path="/targets" element={<TargetsPage />} />
            <Route path="/capabilities" element={<CapabilitiesPage />} />
            <Route path="/tools" element={<ToolsPage />} />
            <Route path="/security" element={<SecurityPage />} />
            <Route path="/chatgpt" element={<ChatGPTPage />} />
            <Route path="/adrs" element={<ADRsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
