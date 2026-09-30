import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  Share2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Filter,
  Search,
  BookOpen,
  Info,
  Maximize2,
  Sparkles,
} from 'lucide-react';
import { DocumentRecord } from '../types/index.ts';

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  type: 'subject' | 'document' | 'concept';
  subject: string;
  size: number;
  color: string;
  chunksCount?: number;
  summary?: string;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  relationship: string;
  strength?: number;
}

interface KnowledgeGraphD3Props {
  documents: DocumentRecord[];
}

export const KnowledgeGraphD3: React.FC<KnowledgeGraphD3Props> = ({ documents }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [chargeStrength, setChargeStrength] = useState(-280);

  // Derive graph data from documents and topics
  const getGraphData = (): { nodes: GraphNode[]; links: GraphLink[] } => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const nodeMap = new Set<string>();

    const addNode = (node: GraphNode) => {
      if (!nodeMap.has(node.id)) {
        nodeMap.add(node.id);
        nodes.push(node);
      }
    };

    // Subject Root Nodes
    const subjects = ['Python', 'Data Structures', 'Calculus', 'Machine Learning'];
    const subjectColors: Record<string, string> = {
      Python: '#10b981', // emerald
      'Data Structures': '#06b6d4', // cyan
      Calculus: '#f59e0b', // amber
      'Machine Learning': '#8b5cf6', // purple
    };

    subjects.forEach((subj) => {
      addNode({
        id: `subj_${subj}`,
        name: subj,
        type: 'subject',
        subject: subj,
        size: 26,
        color: subjectColors[subj] || '#3b82f6',
        summary: `Core academic subject discipline for ${subj}.`,
      });
    });

    // Ingested Documents
    documents.forEach((doc) => {
      const docSubj = doc.subject || 'Python';
      const docId = `doc_${doc.id}`;
      addNode({
        id: docId,
        name: doc.title,
        type: 'document',
        subject: docSubj,
        size: 18,
        color: '#64748b',
        chunksCount: doc.chunkCount || 4,
        summary: `Verified course document with ${doc.chunkCount || 4} indexed semantic chunks.`,
      });

      // Link Document -> Subject
      links.push({
        source: docId,
        target: `subj_${docSubj}`,
        relationship: 'belongs_to',
      });
    });

    // Curated Academic Knowledge Topics & Connections
    const topicRelations = [
      { id: 'c_recursion', name: 'Recursion & Base Cases', subject: 'Python', parentDoc: 'doc_1', related: ['c_callstack', 'c_trees'] },
      { id: 'c_callstack', name: 'Call Stack & Stack Overflow', subject: 'Python', parentDoc: 'doc_1', related: ['c_memory'] },
      { id: 'c_gil', name: 'Python GIL & Threads', subject: 'Python', parentDoc: 'doc_1', related: ['c_concurrency'] },
      { id: 'c_concurrency', name: 'Multiprocessing & Async', subject: 'Python', parentDoc: 'doc_1', related: ['c_gil'] },
      { id: 'c_bigo', name: 'Big-O Time Complexity', subject: 'Data Structures', parentDoc: 'doc_2', related: ['c_binsearch', 'c_sort'] },
      { id: 'c_binsearch', name: 'Binary Search (O(log n))', subject: 'Data Structures', parentDoc: 'doc_2', related: ['c_bigo', 'c_trees'] },
      { id: 'c_trees', name: 'Binary Search Trees (BST)', subject: 'Data Structures', parentDoc: 'doc_2', related: ['c_recursion'] },
      { id: 'c_derivatives', name: 'Derivatives & Power Rule', subject: 'Calculus', parentDoc: 'doc_3', related: ['c_integration', 'c_limits'] },
      { id: 'c_limits', name: 'Limits & Continuity', subject: 'Calculus', parentDoc: 'doc_3', related: ['c_derivatives'] },
      { id: 'c_integration', name: 'Integration & Area Under Curve', subject: 'Calculus', parentDoc: 'doc_3', related: ['c_derivatives'] },
      { id: 'c_gradient', name: 'Gradient Descent & Loss', subject: 'Machine Learning', parentDoc: 'doc_4', related: ['c_derivatives'] },
    ];

    topicRelations.forEach((t) => {
      addNode({
        id: t.id,
        name: t.name,
        type: 'concept',
        subject: t.subject,
        size: 13,
        color: subjectColors[t.subject] || '#38bdf8',
        summary: `Core knowledge concept in ${t.subject}. Verified by AI tutor.`,
      });

      // Link to parent subject
      links.push({
        source: t.id,
        target: `subj_${t.subject}`,
        relationship: 'topic_of',
      });

      // Cross-concept connections
      t.related.forEach((relId) => {
        links.push({
          source: t.id,
          target: relId,
          relationship: 'concept_link',
        });
      });
    });

    return { nodes, links };
  };

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 800;
    const height = 550;

    const { nodes, links } = getGraphData();

    // Filter nodes by subject or search
    const filteredNodes = nodes.filter((n) => {
      const matchSubject = selectedSubject === 'All' || n.subject === selectedSubject;
      const matchSearch =
        !searchFilter ||
        n.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        n.subject.toLowerCase().includes(searchFilter.toLowerCase());
      return matchSubject && matchSearch;
    });

    const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));
    const filteredLinks = links.filter(
      (l) =>
        filteredNodeIds.has(typeof l.source === 'object' ? (l.source as GraphNode).id : l.source) &&
        filteredNodeIds.has(typeof l.target === 'object' ? (l.target as GraphNode).id : l.target)
    );

    // Clear previous SVG contents
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3
      .select(svgRef.current)
      .attr('viewBox', [0, 0, width, height])
      .attr('width', '100%').attr('height', height);

    // Zoom container
    const g = svg.append('g');

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setZoomLevel(event.transform.k);
      });

    svg.call(zoom);

    // Force simulation
    const simulation = d3
      .forceSimulation<GraphNode>(filteredNodes)
      .force(
        'link',
        d3
          .forceLink<GraphNode, GraphLink>(filteredLinks)
          .id((d) => d.id)
          .distance((d) => (d.relationship === 'belongs_to' ? 70 : 90))
      )
      .force('charge', d3.forceManyBody().strength(chargeStrength))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius((d: any) => d.size + 14));

    // Render Link Lines
    const link = g
      .append('g')
      .attr('stroke', '#334155')
      .attr('stroke-opacity', 0.6)
      .selectAll('line')
      .data(filteredLinks)
      .join('line')
      .attr('stroke-width', (d) => (d.relationship === 'belongs_to' ? 2 : 1.2))
      .attr('stroke-dasharray', (d) => (d.relationship === 'concept_link' ? '4 3' : 'none'));

    // Drag behavior
    const drag = (simulation: d3.Simulation<GraphNode, undefined>) => {
      function dragstarted(event: any, d: GraphNode) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      }
      function dragged(event: any, d: GraphNode) {
        d.fx = event.x;
        d.fy = event.y;
      }
      function dragended(event: any, d: GraphNode) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }
      return d3.drag<SVGGElement, GraphNode>().on('start', dragstarted).on('drag', dragged).on('end', dragended);
    };

    // Render Node Groups
    const node = g
      .append('g')
      .selectAll<SVGGElement, GraphNode>('g')
      .data(filteredNodes)
      .join('g')
      .call(drag(simulation as any))
      .on('click', (event, d) => {
        setSelectedNode(d);
      });

    // Outer glow for subject nodes
    node
      .filter((d) => d.type === 'subject')
      .append('circle')
      .attr('r', (d) => d.size + 5)
      .attr('fill', (d) => d.color)
      .attr('fill-opacity', 0.2);

    // Node Circle
    node
      .append('circle')
      .attr('r', (d) => d.size)
      .attr('fill', (d) => d.color)
      .attr('stroke', '#0f172a')
      .attr('stroke-width', 2.5)
      .attr('cursor', 'grab')
      .attr('class', 'transition-transform duration-200 hover:scale-125');

    // Label Text
    node
      .append('text')
      .text((d) => (d.name.length > 20 ? d.name.slice(0, 18) + '...' : d.name))
      .attr('x', 0)
      .attr('y', (d) => d.size + 12)
      .attr('text-anchor', 'middle')
      .attr('fill', '#e2e8f0')
      .attr('font-size', (d) => (d.type === 'subject' ? '12px' : '10px'))
      .attr('font-weight', (d) => (d.type === 'subject' ? '600' : '400'))
      .attr('pointer-events', 'none');

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [documents, selectedSubject, searchFilter, chargeStrength]);

  const handleResetZoom = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(500).call(d3.zoom<SVGSVGElement, unknown>().transform, d3.zoomIdentity);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
      {/* Top Header & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <span>RAG Knowledge Base Topic Graph</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                D3.js Force Simulation
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Interactive force-directed visualization showing semantic relations between subjects, documents, and topics
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search topics..."
              className="bg-slate-800 border border-slate-700 text-xs rounded-xl pl-8 pr-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-36 sm:w-44"
            />
          </div>

          {/* Subject Filter */}
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none"
          >
            <option value="All">All Subjects</option>
            <option value="Python">Python</option>
            <option value="Data Structures">Data Structures</option>
            <option value="Calculus">Calculus</option>
            <option value="Machine Learning">Machine Learning</option>
          </select>

          {/* Zoom & Reset Button */}
          <button
            onClick={handleResetZoom}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
            title="Reset Zoom & Pan"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Canvas + Inspector Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* SVG Container */}
        <div
          ref={containerRef}
          className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-2xl relative overflow-hidden min-h-[520px] flex items-center justify-center cursor-move"
        >
          <svg ref={svgRef} className="w-full h-[520px]" />

          {/* Legend Overlay */}
          <div className="absolute bottom-3 left-3 bg-slate-900/90 border border-slate-800 backdrop-blur-md rounded-xl p-2.5 text-[10px] space-y-1.5 text-slate-300 pointer-events-none">
            <div className="font-semibold text-white uppercase tracking-wider text-[9px] mb-1">Graph Legend</div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span>Subject Discipline (Central Node)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-slate-500" />
              <span>Ingested Study Document</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              <span>Academic Topic / Concept</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-4 border-t border-dashed border-slate-400" />
              <span>Cross-Concept Prerequisite</span>
            </div>
          </div>
        </div>

        {/* Node Inspector Panel */}
        <div className="lg:col-span-4 bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                <Info className="w-3.5 h-3.5 text-emerald-400" />
                <span>Node Inspector</span>
              </span>
              {selectedNode && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {selectedNode.type}
                </span>
              )}
            </div>

            {selectedNode ? (
              <div className="space-y-3.5">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedNode.color }} />
                    <span>{selectedNode.name}</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">{selectedNode.summary}</p>
                </div>

                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Discipline Subject:</span>
                    <span className="text-emerald-400 font-semibold">{selectedNode.subject}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Node Category:</span>
                    <span className="text-slate-200 capitalize">{selectedNode.type}</span>
                  </div>
                  {selectedNode.chunksCount && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Semantic Chunks:</span>
                      <span className="text-sky-400 font-mono">{selectedNode.chunksCount} chunks</span>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-xs text-emerald-300">
                  <span className="font-semibold block mb-1">💡 Voice AI Agent Grounding</span>
                  Students can query this concept directly via voice-to-voice in any language. The tutor retrieves this node and its related concepts to formulate pedagogical explanations.
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center p-4 text-slate-500">
                <Share2 className="w-8 h-8 mb-2 opacity-50 text-slate-400" />
                <p className="text-xs">Click any topic or document node in the graph to inspect its curriculum relationship</p>
              </div>
            )}
          </div>

          {/* Graph Physics Control */}
          <div className="pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
              <span>Node Repulsion Force:</span>
              <span className="font-mono text-emerald-400">{Math.abs(chargeStrength)}</span>
            </div>
            <input
              type="range"
              min="100"
              max="500"
              step="20"
              value={Math.abs(chargeStrength)}
              onChange={(e) => setChargeStrength(-parseInt(e.target.value))}
              className="w-full accent-emerald-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
