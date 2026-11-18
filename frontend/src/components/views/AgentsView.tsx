import React from 'react';
import {
  Cpu,
  Terminal,
  ShieldCheck,
  Database,
  Zap,
  Brain,
  Bot,
  Share2,
  Plus,
  Trash2,
  Clock,
  Quote,
  Check,
  XCircle,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import type {
  Project,
  AgentBlackboard,
  AgentExecution,
  AgentFeedbackItem,
  AgentType,
} from '../../types';
import { DiffViewer } from '../DiffViewer';
import { CopyButton } from '../CopyButton';

interface AgentsViewProps {
  activeProject: Project | null;
  selectedAgentType: AgentType;
  setSelectedAgentType: (type: AgentType) => void;
  customInstruction: string;
  setCustomInstruction: (instruction: string) => void;
  isAgentRunning: boolean;
  isPipelineRunning: boolean;
  handleRunAgentReasoning: () => Promise<void>;
  handleRunPipeline: () => Promise<void>;
  blackboardData: AgentBlackboard | null;
  showInjectMemory: boolean;
  setShowInjectMemory: (show: boolean) => void;
  handleClearMemory: () => Promise<void>;
  handlePublishMemory: (e: React.FormEvent) => Promise<void>;
  newMemoryKey: string;
  setNewMemoryKey: (key: string) => void;
  newMemoryAgent: string;
  setNewMemoryAgent: (agent: string) => void;
  newMemoryValue: string;
  setNewMemoryValue: (val: string) => void;
  currentExecution: AgentExecution | null;
  setCurrentExecution: (exec: AgentExecution | null) => void;
  agentHistory: AgentExecution[];
  feedbackList: AgentFeedbackItem[];
  activeReviewPatch: string | null;
  setActiveReviewPatch: (patch: string | null) => void;
  reviewComments: string;
  setReviewComments: (comments: string) => void;
  handleApplyPatch: (patch: string) => Promise<void>;
  isApplyingPatch: boolean;
  handleSubmitReview: (action: 'approve' | 'reject', content: string, targetType?: string) => Promise<void>;
}

export const AgentsView: React.FC<AgentsViewProps> = ({
  activeProject,
  selectedAgentType,
  setSelectedAgentType,
  customInstruction,
  setCustomInstruction,
  isAgentRunning,
  isPipelineRunning,
  handleRunAgentReasoning,
  handleRunPipeline,
  blackboardData,
  showInjectMemory,
  setShowInjectMemory,
  handleClearMemory,
  handlePublishMemory,
  newMemoryKey,
  setNewMemoryKey,
  newMemoryAgent,
  setNewMemoryAgent,
  newMemoryValue,
  setNewMemoryValue,
  currentExecution,
  setCurrentExecution,
  agentHistory,
  feedbackList,
  activeReviewPatch,
  setActiveReviewPatch,
  reviewComments,
  setReviewComments,
  handleApplyPatch,
  isApplyingPatch,
  handleSubmitReview,
}) => {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-400" />
            Multi-Agent Reasoning Architecture
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-300 border border-blue-700/50">
              Gemini + ADK Core
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Autonomous engineering personas reasoning over deterministic static facts with exact file and line grounding.
          </p>
        </div>
      </div>

      {/* Subagent Persona Selection Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            id: 'discovery',
            title: 'Discovery Specialist',
            icon: Terminal,
            desc: 'Explains codebase topology, tech stacks, and microservice boundaries.',
            tag: 'Architecture',
            color: 'blue',
          },
          {
            id: 'security',
            title: 'Security Reviewer',
            icon: ShieldCheck,
            desc: 'Evaluates AST findings, hardcoded secrets, and CVSS root-cause impact.',
            tag: 'Security & AST',
            color: 'rose',
          },
          {
            id: 'data_readiness',
            title: 'Data & RAG Architect',
            icon: Database,
            desc: 'Analyzes SQL relational constraints, chunk density, and embedding suitability.',
            tag: 'RAG Pipeline',
            color: 'purple',
          },
          {
            id: 'deployment_planner',
            title: 'Cloud Run Strategist',
            icon: Zap,
            desc: 'Formulates Google Cloud Run migration specs, secret bindings, and probes.',
            tag: 'Deployment',
            color: 'emerald',
          },
        ].map((agent) => {
          const Icon = agent.icon;
          const isSelected = selectedAgentType === agent.id;
          return (
            <div
              key={agent.id}
              onClick={() => setSelectedAgentType(agent.id as AgentType)}
              className={`p-4 rounded-xl border transition-all cursor-pointer space-y-2 ${
                isSelected
                  ? 'bg-blue-950/30 border-blue-500 shadow-md'
                  : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-blue-400">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400 font-mono">
                  {agent.tag}
                </span>
              </div>
              <h4 className="font-semibold text-white text-xs">{agent.title}</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">{agent.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Action Box */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span>Optional Enterprise Constraint or Specific Prompt</span>
            <span className="text-[11px] text-slate-500 font-normal">Grounded exclusively on uploaded code facts</span>
          </label>
          <input
            type="text"
            value={customInstruction}
            onChange={(e) => setCustomInstruction(e.target.value)}
            placeholder="e.g. Focus on container startup latency and Secret Manager integration..."
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex items-center justify-between pt-1">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Brain className="w-3.5 h-3.5 text-blue-400" />
            Model: <span className="font-mono text-slate-300">gemini-1.5-pro</span> (with deterministic grounding fallback)
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRunAgentReasoning}
              disabled={isAgentRunning || isPipelineRunning || !activeProject}
              className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all disabled:opacity-50"
            >
              <Bot className="w-4 h-4" />
              {isAgentRunning ? 'Reasoning...' : 'Run Selected Agent'}
            </button>
            <button
              onClick={handleRunPipeline}
              disabled={isAgentRunning || isPipelineRunning || !activeProject}
              className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all disabled:opacity-50"
            >
              <Zap className="w-4 h-4" />
              {isPipelineRunning ? 'Orchestrating 4-Agent Pipeline...' : 'Run 4-Agent Pipeline'}
            </button>
          </div>
        </div>
      </div>

      {/* Blackboard & Shared Memory Bus Card */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-blue-950/60 border border-blue-800/80 text-blue-400">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                Shared Agent Blackboard & Memory Bus
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                  {blackboardData?.total_keys || 0} Key{blackboardData?.total_keys !== 1 ? 's' : ''} Stored
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Inter-agent persistent state bus: subagents synchronize topology, risks, and deployment constraints here.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInjectMemory(!showInjectMemory)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              {showInjectMemory ? 'Cancel' : 'Inject Memory'}
            </button>
            {blackboardData && blackboardData.total_keys > 0 && (
              <button
                onClick={handleClearMemory}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/60 rounded-lg text-xs font-medium transition-all"
                title="Clear all blackboard memories for this project"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear Bus
              </button>
            )}
          </div>
        </div>

        {/* Inject Memory Form */}
        {showInjectMemory && (
          <form onSubmit={handlePublishMemory} className="p-4 bg-slate-950 rounded-xl border border-blue-900/40 space-y-3">
            <div className="text-xs font-semibold text-blue-400 flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5" />
              Inject Enterprise Architecture Constraint into Memory Bus
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Memory Key</label>
                <input
                  type="text"
                  required
                  value={newMemoryKey}
                  onChange={(e) => setNewMemoryKey(e.target.value)}
                  placeholder="e.g. enterprise_compliance_target or custom_policy"
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Source Agent / Role</label>
                <input
                  type="text"
                  value={newMemoryAgent}
                  onChange={(e) => setNewMemoryAgent(e.target.value)}
                  placeholder="human_supervisor"
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Value (JSON or Text Note)</label>
              <textarea
                required
                rows={2}
                value={newMemoryValue}
                onChange={(e) => setNewMemoryValue(e.target.value)}
                placeholder='{"region": "asia-south1", "max_instances": 10}'
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowInjectMemory(false)}
                className="px-3 py-1 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold"
              >
                Publish to Bus
              </button>
            </div>
          </form>
        )}

        {/* Blackboard Keys Grid */}
        {blackboardData && blackboardData.memories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {blackboardData.memories.map((entry) => (
              <div key={entry.id} className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/90 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold text-blue-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>
                    {entry.key}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono">
                    by {entry.source_agent}
                  </span>
                </div>
                <pre className="p-2.5 bg-[#0a0e17] rounded-lg text-[10px] font-mono text-slate-300 overflow-x-auto max-h-40 border border-slate-800/60 leading-relaxed">
                  {JSON.stringify(entry.value, null, 2)}
                </pre>
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1">
                  <span>Confidence: {(entry.confidence * 100).toFixed(0)}%</span>
                  <span>{new Date(entry.updated_at).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-950/50 border border-dashed border-slate-800 text-center text-xs text-slate-500">
            No memories published on the blackboard bus yet. Run the 4-Agent Pipeline or inject custom constraints above to initialize shared memory.
          </div>
        )}
      </div>

      {/* Current Execution Output */}
      {currentExecution ? (
        <div className="space-y-6">
          {/* Thought Chain Accordion */}
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wide flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-400" />
                Autonomous Thought Chain ({currentExecution.thought_chain.length} Steps)
              </h3>
              <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {currentExecution.execution_time_ms}ms
                </span>
                <span>&bull;</span>
                <span>~{currentExecution.tokens_used} tokens</span>
              </div>
            </div>

            <div className="space-y-2.5 pt-2">
              {currentExecution.thought_chain.map((step) => (
                <div
                  key={step.step_number}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5 text-xs"
                >
                  <div className="flex items-center gap-2 text-blue-400 font-semibold text-[11px]">
                    <span className="px-1.5 py-0.5 rounded bg-blue-950 border border-blue-800/80">
                      Step {step.step_number}
                    </span>
                    <span>{step.thought}</span>
                  </div>
                  {step.action && (
                    <div className="text-slate-400 text-[11px] pl-2 border-l border-slate-800">
                      <span className="text-slate-500 font-mono">Action: </span>
                      {step.action}
                    </div>
                  )}
                  {step.observation && (
                    <div className="text-slate-300 text-[11px] pl-2 border-l border-blue-900/50">
                      <span className="text-emerald-400 font-mono">Observation: </span>
                      {step.observation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Grounded Citations Drawer */}
          {currentExecution.citations.length > 0 && (
            <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wide flex items-center gap-2">
                <Quote className="w-4 h-4 text-emerald-400" />
                Deterministic Evidence Citations ({currentExecution.citations.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {currentExecution.citations.map((c, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 space-y-1 text-xs"
                  >
                    <div className="font-mono text-blue-400 text-[11px] font-semibold flex items-center justify-between">
                      <span>{c.file_path}</span>
                      {c.line_start && (
                        <span className="text-slate-500">L{c.line_start}-{c.line_end}</span>
                      )}
                    </div>
                    <pre className="text-[10px] text-slate-300 font-mono bg-slate-900 p-2 rounded truncate">
                      {c.quote || 'Citing configuration block'}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Formatted Markdown Analysis */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Bot className="w-4 h-4 text-blue-400" />
              Agent Synthesis & Technical Advisory
            </h3>
            <div className="p-5 bg-slate-950 rounded-xl border border-slate-800/80 text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
              {currentExecution.output_markdown}
            </div>
          </div>

          {/* Generated Artifacts Drawer (Patches & Terraform) */}
          {currentExecution.structured_data && (currentExecution.structured_data.terraform_config || currentExecution.structured_data.unified_diff_patches) && (
            <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wide flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                Generated Production IaC & Automated Code Patches
              </h3>
              {currentExecution.structured_data.unified_diff_patches && currentExecution.structured_data.unified_diff_patches.length > 0 && (
                <div className="space-y-3">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase">Git-Compatible Unified Diff Patches (Human Review Gate)</div>
                  {currentExecution.structured_data.unified_diff_patches.map((patch: string, pIdx: number) => {
                    const isApplied = feedbackList.some((f) => f.status === 'applied' && f.original_content === patch);
                    const isRejected = feedbackList.some((f) => f.action === 'reject' && f.original_content === patch);
                    return (
                      <div key={pIdx} className="space-y-2 p-3 bg-[#0a0e17] rounded-xl border border-slate-800">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono text-slate-400">Patch #{pIdx + 1}</span>
                          <div className="flex items-center gap-2">
                            {isApplied ? (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1 font-mono">
                                <Check className="w-3 h-3" /> Applied to Codebase
                              </span>
                            ) : isRejected ? (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 flex items-center gap-1 font-mono">
                                <XCircle className="w-3 h-3" /> Rejected by Reviewer
                              </span>
                            ) : (
                              <>
                                <button
                                  onClick={() => setActiveReviewPatch(activeReviewPatch === patch ? null : patch)}
                                  className="text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-900 border border-slate-800"
                                >
                                  {activeReviewPatch === patch ? 'Cancel Note' : '+ Note'}
                                </button>
                                <button
                                  onClick={() => handleApplyPatch(patch)}
                                  disabled={isApplyingPatch}
                                  className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium transition-colors disabled:opacity-50"
                                >
                                  <Check className="w-3 h-3" />
                                  {isApplyingPatch ? 'Applying...' : 'Approve & Apply'}
                                </button>
                                <button
                                  onClick={() => handleSubmitReview('reject', patch, 'patch')}
                                  className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 text-slate-400 rounded text-xs font-medium transition-colors"
                                >
                                  <ThumbsDown className="w-3 h-3" />
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        {activeReviewPatch === patch && (
                          <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 space-y-1.5">
                            <label className="text-[11px] text-slate-300 block">Reviewer Note / Decision Rationale</label>
                            <input
                              type="text"
                              value={reviewComments}
                              onChange={(e) => setReviewComments(e.target.value)}
                              placeholder="e.g. Approved dependency pin for production stability..."
                              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                            />
                          </div>
                        )}
                        <DiffViewer diffText={patch} />
                      </div>
                    );
                  })}
                </div>
              )}
              {currentExecution.structured_data.terraform_config && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase">Google Cloud Run v2 Terraform Resource</div>
                    <div className="flex items-center gap-2">
                      <CopyButton text={currentExecution.structured_data.terraform_config} label="Copy HCL" />
                      {feedbackList.some((f) => f.target_type === 'terraform' && f.action === 'approve') ? (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 flex items-center gap-1 font-mono">
                          <Check className="w-3 h-3" /> IaC Approved
                        </span>
                      ) : (
                        <>
                          <button
                            onClick={() => handleSubmitReview('approve', currentExecution.structured_data.terraform_config, 'terraform')}
                            className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium transition-colors"
                          >
                            <ThumbsUp className="w-3 h-3" /> Approve IaC
                          </button>
                          <button
                            onClick={() => handleSubmitReview('reject', currentExecution.structured_data.terraform_config, 'terraform')}
                            className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 text-slate-400 rounded text-xs font-medium transition-colors"
                          >
                            <ThumbsDown className="w-3 h-3" /> Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <pre className="p-3 bg-[#0a0e17] rounded-lg text-[11px] font-mono text-blue-300 overflow-x-auto whitespace-pre leading-relaxed border border-slate-800">
                    {currentExecution.structured_data.terraform_config}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="p-12 text-center border border-slate-800 rounded-2xl bg-slate-900/40">
          <Bot className="w-10 h-10 text-slate-500 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-white">No Agent Reasoning Executed Yet</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Select an engineering persona above and click "Run Agent Reasoning" to generate structured, evidence-backed recommendations.
          </p>
        </div>
      )}

      {/* Execution History */}
      {agentHistory.length > 0 && (
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Agent Reasoning History ({agentHistory.length} runs)
          </h3>
          <div className="space-y-2">
            {agentHistory.map((hist) => (
              <div
                key={hist.id}
                onClick={() => setCurrentExecution(hist)}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                  currentExecution?.id === hist.id
                    ? 'bg-blue-950/20 border-blue-500/40'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Bot className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-semibold text-white uppercase font-mono">
                    {hist.agent_type.replace('_', ' ')}
                  </span>
                  <span className="text-[11px] text-slate-500">&bull;</span>
                  <span className="text-[11px] text-slate-400 font-mono">{hist.model_name}</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono">
                  <span>{new Date(hist.created_at).toLocaleTimeString()}</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                    {hist.citations.length} citation(s)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
