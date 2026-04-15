'use client';

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface EscolaSAEB {
  id: string;
  escola: string;
  municipio: string;
  rede: string;
  etapa: string;
  lp: number;
  mat: number;
  alunos_presentes: number;
  alunos_matriculados: number;
}

interface NivelProficiencia {
  nivel: string;
  cor: string;
  corFundo: string;
  descricao: string;
}

export default function Home() {
  const [dados, setDados] = useState<EscolaSAEB[]>([]);
  const [etapa, setEtapa] = useState('5º');
  const [disciplina, setDisciplina] = useState('geral');
  const [taxaFluxo, setTaxaFluxo] = useState(1);
  const [escolaSelecionada, setEscolaSelecionada] = useState('todas');
  const [loading, setLoading] = useState(true);
  
  // States para o modal de código
  const [showCodeModal, setShowCodeModal] = useState(true);
  const [codigo, setCodigo] = useState('');
  const [codigoErro, setCodigoErro] = useState('');
  const [codigoVerificado, setCodigoVerificado] = useState(false);

  // ============================================
  // FUNÇÕES DE CLASSIFICAÇÃO (declaradas primeiro)
  // ============================================
  
  const classificarProficiencia = (notaSAEB: number, etapa: string, disciplinaTipo: 'lp' | 'mat'): NivelProficiencia => {
    // Converter nota 0-10 de volta para escala 0-500
    const escalaOriginal = notaSAEB * 50;
    
    // Parâmetros oficiais do INEP baseados nas escalas de proficiência do SAEB
    const niveis: any = {
      '5º': {
        lp: {
          abaixo: 200,
          basico: 200,
          adequado: 250,
          avancado: 300
        },
        mat: {
          abaixo: 225,
          basico: 225,
          adequado: 275,
          avancado: 325
        }
      },
      '9º': {
        lp: {
          abaixo: 250,
          basico: 250,
          adequado: 300,
          avancado: 350
        },
        mat: {
          abaixo: 275,
          basico: 275,
          adequado: 325,
          avancado: 375
        }
      }
    };
    
    const params = niveis[etapa as '5º' | '9º'][disciplinaTipo];
    
    if (escalaOriginal >= params.avancado) {
      return { 
        nivel: 'Avançado', 
        cor: 'text-green-700',
        corFundo: 'bg-green-100 border-green-300',
        descricao: 'Desempenho muito acima do esperado para a etapa'
      };
    }
    if (escalaOriginal >= params.adequado) {
      return { 
        nivel: 'Adequado', 
        cor: 'text-blue-700',
        corFundo: 'bg-blue-100 border-blue-300',
        descricao: 'Desempenho adequado para a etapa'
      };
    }
    if (escalaOriginal >= params.basico) {
      return { 
        nivel: 'Básico', 
        cor: 'text-yellow-700',
        corFundo: 'bg-yellow-100 border-yellow-300',
        descricao: 'Desempenho básico, precisa de atenção'
      };
    }
    return { 
      nivel: 'Abaixo do básico', 
      cor: 'text-red-700',
      corFundo: 'bg-red-100 border-red-300',
      descricao: 'Desempenho crítico, necessita intervenção prioritária'
    };
  };

  const classificarProficienciaGeral = (notaSAEB: number, etapa: string): NivelProficiencia => {
    const escalaOriginal = notaSAEB * 50;
    
    const niveis: any = {
      '5º': { abaixo: 212, basico: 212, adequado: 262, avancado: 312 },
      '9º': { abaixo: 262, basico: 262, adequado: 312, avancado: 362 }
    };
    
    const params = niveis[etapa as '5º' | '9º'];
    
    if (escalaOriginal >= params.avancado) {
      return { 
        nivel: 'Avançado', 
        cor: 'text-green-700',
        corFundo: 'bg-green-100 border-green-300',
        descricao: 'Desempenho muito acima do esperado'
      };
    }
    if (escalaOriginal >= params.adequado) {
      return { 
        nivel: 'Adequado', 
        cor: 'text-blue-700',
        corFundo: 'bg-blue-100 border-blue-300',
        descricao: 'Desempenho adequado para a etapa'
      };
    }
    if (escalaOriginal >= params.basico) {
      return { 
        nivel: 'Básico', 
        cor: 'text-yellow-700',
        corFundo: 'bg-yellow-100 border-yellow-300',
        descricao: 'Desempenho básico'
      };
    }
    return { 
      nivel: 'Abaixo do básico', 
      cor: 'text-red-700',
      corFundo: 'bg-red-100 border-red-300',
      descricao: 'Desempenho crítico'
    };
  };

  // ============================================
  // useEffect e outras funções
  // ============================================

  useEffect(() => {
    // Verificar se já foi verificado nesta sessão
    const jaVerificado = sessionStorage.getItem('dien_verified');
    if (jaVerificado === 'true') {
      setShowCodeModal(false);
      setCodigoVerificado(true);
    }
    
    fetch('/saeb.json')
      .then(res => res.json())
      .then(data => {
        setDados(data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Erro ao carregar dados:', error);
        setLoading(false);
      });
  }, []);

  const verificarCodigo = () => {
    if (codigo === 'DIEN2026') {
      setShowCodeModal(false);
      setCodigoVerificado(true);
      sessionStorage.setItem('dien_verified', 'true');
      setCodigoErro('');
    } else {
      setCodigoErro('Código incorreto. Tente novamente.');
      setCodigo('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      verificarCodigo();
    }
  };

  // Calcular nota SAEB de uma escola específica
  const calcularNotaSAEB = (escola: EscolaSAEB) => {
    const mediaEscola = (escola.lp + escola.mat) / 2;
    return (mediaEscola / 50) * taxaFluxo;
  };

  // Cor da nota SAEB baseada no valor
  const getNotaCor = (nota: number) => {
    if (nota >= 7) return 'text-green-600';
    if (nota >= 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  // ============================================
  // RENDERIZAÇÃO DO MODAL (antes do conteúdo)
  // ============================================
  
  if (showCodeModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
        <div className="relative max-w-md w-full">
          {/* Efeito de brilho atrás do modal */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl blur-2xl opacity-20 animate-pulse"></div>
          
          {/* Modal principal */}
          <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all">
            {/* Barra superior colorida */}
            <div className="h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500"></div>
            
            <div className="p-8">
              {/* Ícone de segurança */}
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
              
              {/* Título e descrição */}
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  Acesso Restrito
                </h2>
                <p className="text-gray-500 text-sm">
                  Este dashboard contém dados confidenciais do SAEB.
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  Digite o código de acesso para continuar.
                </p>
              </div>
              
              {/* Campo de código */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código de Acesso
                </label>
                <input
                  type="password"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Digite o código..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-center text-lg tracking-wider font-mono"
                  autoFocus
                />
                {codigoErro && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {codigoErro}
                  </p>
                )}
              </div>
              
              {/* Botão de verificar */}
              <button
                onClick={verificarCodigo}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-[1.02] shadow-lg"
              >
                Verificar Acesso
              </button>
              
              {/* Texto de segurança */}
              <p className="text-center text-xs text-gray-400 mt-6">
                🔒 Sistema seguro | Acesso monitorado
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // LOADING
  // ============================================
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-600">Carregando dados do SAEB...</div>
        </div>
      </div>
    );
  }

  // ============================================
  // PROCESSAMENTO DOS DADOS
  // ============================================
  
  // Filtrar por etapa
  let dadosFiltrados = dados.filter(d => d.etapa === etapa);
  
  // Filtrar por escola
  if (escolaSelecionada !== 'todas') {
    dadosFiltrados = dadosFiltrados.filter(d => d.escola === escolaSelecionada);
  }

  // Calcular médias
  const mediaLP = dadosFiltrados.reduce((acc, d) => acc + d.lp, 0) / (dadosFiltrados.length || 1);
  const mediaMAT = dadosFiltrados.reduce((acc, d) => acc + d.mat, 0) / (dadosFiltrados.length || 1);
  const mediaGeral = (mediaLP + mediaMAT) / 2;

  // NOTA SAEB (0-10)
  const notaSAEB = (mediaGeral / 50) * taxaFluxo;
  const classificacaoGeral = classificarProficienciaGeral(notaSAEB, etapa);

  // Dados para o gráfico por escola
  const dadosGrafico = dadosFiltrados.map(d => {
    const mediaEscola = (d.lp + d.mat) / 2;
    const notaEscola = (mediaEscola / 50) * taxaFluxo;
    const classificacaoLP = classificarProficiencia(notaEscola, etapa, 'lp');
    const classificacaoMAT = classificarProficiencia(notaEscola, etapa, 'mat');
    
    return {
      escola: d.escola.length > 35 ? d.escola.substring(0, 32) + '...' : d.escola,
      'Língua Portuguesa': Math.round(d.lp),
      Matemática: Math.round(d.mat),
      'Média Geral': Math.round(mediaEscola),
      'Nota SAEB (0-10)': Number(notaEscola.toFixed(1)),
      notaOriginal: notaEscola,
      nivelLP: classificacaoLP.nivel,
      nivelMAT: classificacaoMAT.nivel,
      corNivelLP: classificacaoLP.corFundo,
      corNivelMAT: classificacaoMAT.corFundo
    };
  });

  // Ordenar por nota SAEB (decrescente)
  const dadosGraficoOrdenados = [...dadosGrafico].sort((a, b) => b.notaOriginal - a.notaOriginal);

  // Lista única de escolas para o filtro
  const escolasUnicas = [...new Set(dados.filter(d => d.etapa === etapa).map(d => d.escola))];

  // ============================================
  // RENDERIZAÇÃO PRINCIPAL
  // ============================================

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cabeçalho */}
      <div className="bg-blue-800 text-white p-6 shadow-lg">
        <h1 className="text-3xl font-bold">📊 Dashboard SAEB 2025</h1>
        <p className="text-blue-200 mt-2">Resultados preliminares por escola | Nota padronizada 0 a 10 | Níveis INEP</p>
        {/* Badge de acesso verificado */}
        <div className="mt-2 inline-flex items-center gap-1 bg-green-600 text-white text-xs px-2 py-1 rounded-full">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Acesso Verificado
        </div>
      </div>

      <div className="p-6">
        {/* Painel de Filtros */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">🎛️ Filtros</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Filtro Etapa */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Etapa de Ensino</label>
              <select
                value={etapa}
                onChange={(e) => setEtapa(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="5º">5º Ano do Ensino Fundamental</option>
                <option value="9º">9º Ano do Ensino Fundamental</option>
              </select>
            </div>

            {/* Filtro Disciplina */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Visualizar</label>
              <select
                value={disciplina}
                onChange={(e) => setDisciplina(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="geral">📊 Nota SAEB (0-10)</option>
                <option value="lp">📖 Média Língua Portuguesa</option>
                <option value="mat">🔢 Média Matemática</option>
              </select>
            </div>

            {/* Filtro Escola */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Escola</label>
              <select
                value={escolaSelecionada}
                onChange={(e) => setEscolaSelecionada(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="todas">🏫 Todas as escolas</option>
                {escolasUnicas.map((escola, idx) => (
                  <option key={idx} value={escola}>{escola}</option>
                ))}
              </select>
            </div>

            {/* Taxa de Fluxo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Taxa de Aprovação (Fluxo)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={taxaFluxo}
                onChange={(e) => setTaxaFluxo(Number(e.target.value))}
                className={`w-full border rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 ${
                  taxaFluxo === 1 ? 'bg-green-100 border-green-400' : 'bg-yellow-50 border-yellow-400'
                }`}
              />
              <p className="text-xs text-gray-500 mt-1">
                {taxaFluxo === 1 ? '✓ Padrão (100%)' : '⚠️ Modo simulação'}
              </p>
            </div>
          </div>
        </div>

        {/* Cards de Resultado */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          {/* Card LP */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-md p-6 text-white">
            <p className="text-sm opacity-90">📖 Média em Português</p>
            <p className="text-3xl font-bold mt-2">{Math.round(mediaLP)}</p>
            <p className="text-xs mt-2">Base: {dadosFiltrados.length} escolas</p>
          </div>
          
          {/* Card MAT */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow-md p-6 text-white">
            <p className="text-sm opacity-90">🔢 Média em Matemática</p>
            <p className="text-3xl font-bold mt-2">{Math.round(mediaMAT)}</p>
            <p className="text-xs mt-2">Base: {dadosFiltrados.length} escolas</p>
          </div>
          
          {/* Card Média Geral */}
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg shadow-md p-6 text-white">
            <p className="text-sm opacity-90">📊 Média Geral (LP+MAT)/2</p>
            <p className="text-3xl font-bold mt-2">{Math.round(mediaGeral)}</p>
            <p className="text-xs mt-2">Pontuação bruta SAEB</p>
          </div>

          {/* Card Nota SAEB */}
          <div className={`rounded-lg shadow-md p-6 text-white ${
            taxaFluxo === 1 
              ? 'bg-gradient-to-r from-indigo-600 to-indigo-700' 
              : 'bg-gradient-to-r from-orange-600 to-orange-700'
          }`}>
            <p className="text-sm opacity-90">
              {taxaFluxo === 1 ? '⭐ NOTA SAEB (0-10) - (previsão)' : '🎲 SIMULAÇÃO SAEB'}
            </p>
            <p className="text-4xl font-bold mt-2">{notaSAEB.toFixed(1)}</p>
            <p className="text-xs mt-2">
              Fórmula: (Média Geral ÷ 50) × {Math.round(taxaFluxo * 100)}%
            </p>
          </div>
        </div>

        {/* Classificação Geral da Rede */}
        <div className={`${classificacaoGeral.corFundo} border rounded-lg p-4 mb-6`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">📈 Classificação da Rede - {etapa} ano</p>
              <p className={`text-2xl font-bold ${classificacaoGeral.cor}`}>{classificacaoGeral.nivel}</p>
              <p className="text-xs text-gray-600 mt-1">{classificacaoGeral.descricao}</p>
            </div>
            <div className="text-right">
              <p className="text-sm">Nota SAEB: <strong>{notaSAEB.toFixed(1)}</strong></p>
              <p className="text-xs text-gray-500">Escala original: {Math.round(mediaGeral)} pontos</p>
            </div>
          </div>
        </div>

        {/* Explicação da Fórmula */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            📐 <strong>Fórmula da Nota SAEB (0-10):</strong> 
            [(Média LP + Média MAT) / 2] ÷ 50 × Taxa de Fluxo
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Exemplo: Média 250 ÷ 50 = 5,0 × Fluxo (1,0) = Nota 5,0
          </p>
        </div>

        {/* Tabela de Níveis de Proficiência - Referência */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <h3 className="text-sm font-semibold mb-3">📖 Referência: Níveis de Proficiência SAEB - {etapa} ano</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium mb-2">Língua Portuguesa</p>
              <div className="space-y-1">
                <div className="flex justify-between"><span>Abaixo do básico:</span><span>&lt; {etapa === '5º' ? '200' : '250'}</span></div>
                <div className="flex justify-between"><span>Básico:</span><span>{etapa === '5º' ? '200-249' : '250-299'}</span></div>
                <div className="flex justify-between"><span>Adequado:</span><span>{etapa === '5º' ? '250-299' : '300-349'}</span></div>
                <div className="flex justify-between"><span>Avançado:</span><span>≥ {etapa === '5º' ? '300' : '350'}</span></div>
              </div>
            </div>
            <div>
              <p className="font-medium mb-2">Matemática</p>
              <div className="space-y-1">
                <div className="flex justify-between"><span>Abaixo do básico:</span><span>&lt; {etapa === '5º' ? '225' : '275'}</span></div>
                <div className="flex justify-between"><span>Básico:</span><span>{etapa === '5º' ? '225-274' : '275-324'}</span></div>
                <div className="flex justify-between"><span>Adequado:</span><span>{etapa === '5º' ? '275-324' : '325-374'}</span></div>
                <div className="flex justify-between"><span>Avançado:</span><span>≥ {etapa === '5º' ? '325' : '375'}</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Gráfico de Barras por Escola - Nota SAEB */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">
            🏆 Ranking das Escolas - Nota SAEB (0 a 10)
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Ordenado da maior para a menor nota | Taxa de fluxo atual: {Math.round(taxaFluxo * 100)}%
          </p>
          <ResponsiveContainer width="100%" height={500}>
            <BarChart 
              data={dadosGraficoOrdenados} 
              layout="vertical" 
              margin={{ left: 120, right: 30, top: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="number" 
                domain={[0, 10]} 
                tickCount={11}
                label={{ value: 'Nota SAEB (0-10)', position: 'bottom', offset: 0 }}
              />
              <YAxis 
                type="category" 
                dataKey="escola" 
                width={250} 
                tick={{ fontSize: 11 }} 
              />
              <Tooltip 
                formatter={(value: any) => [`${value} pontos`, 'Nota SAEB']}
                labelFormatter={(label) => `Escola: ${label}`}
              />
              <Legend />
              <Bar dataKey="Nota SAEB (0-10)" fill="#6366f1" radius={[0, 4, 4, 0]}>
                {dadosGraficoOrdenados.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.notaOriginal >= 7 ? '#22c55e' : entry.notaOriginal >= 5 ? '#eab308' : '#ef4444'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico comparativo LP x MAT */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">📊 Comparativo: Português vs Matemática (Médias Brutas)</h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={dadosGrafico} margin={{ left: 100, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="category" dataKey="escola" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 10 }} />
              <YAxis type="number" domain={[0, 350]} label={{ value: 'Média SAEB', angle: -90, position: 'left' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Língua Portuguesa" fill="#3b82f6" />
              <Bar dataKey="Matemática" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tabela de Escolas com Nota SAEB e Níveis */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">📋 Detalhamento por Escola</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Escola</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LP</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nível LP</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MAT</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nível MAT</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Média</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nota SAEB</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Alunos</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dadosFiltrados.map((escola, idx) => {
                  const mediaBruta = (escola.lp + escola.mat) / 2;
                  const notaSAEBEscola = (mediaBruta / 50) * taxaFluxo;
                  const nivelLP = classificarProficiencia(notaSAEBEscola, etapa, 'lp');
                  const nivelMAT = classificarProficiencia(notaSAEBEscola, etapa, 'mat');
                  
                  return (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{escola.escola}</td>
                      <td className="px-6 py-4 text-sm font-medium">{Math.round(escola.lp)}</td>
                      <td className={`px-6 py-4 text-sm rounded-full ${nivelLP.corFundo} ${nivelLP.cor} font-medium`}>
                        {nivelLP.nivel}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">{Math.round(escola.mat)}</td>
                      <td className={`px-6 py-4 text-sm rounded-full ${nivelMAT.corFundo} ${nivelMAT.cor} font-medium`}>
                        {nivelMAT.nivel}
                      </td>
                      <td className="px-6 py-4 text-sm">{Math.round(mediaBruta)}</td>
                      <td className={`px-6 py-4 text-sm font-bold ${getNotaCor(notaSAEBEscola)}`}>
                        {notaSAEBEscola.toFixed(1)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{escola.alunos_presentes}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {dadosFiltrados.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Nenhuma escola encontrada para os filtros selecionados.
            </div>
          )}
        </div>

        {/* Legenda de Cores */}
        <div className="mt-6 bg-white rounded-lg shadow-md p-4">
          <h3 className="text-sm font-semibold mb-2">📌 Legenda da Nota SAEB (0-10)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
            <div className="space-y-2">
              <p className="font-medium">Classificação por Nota</p>
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span>Nota ≥ 7 (Bom)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                  <span>5 ≤ Nota &lt; 7 (Regular)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span>Nota &lt; 5 (Atenção)</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <p className="font-medium">Níveis de Proficiência INEP</p>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
                  <span>Avançado</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
                  <span>Adequado</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
                  <span>Básico</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
                  <span>Abaixo do básico</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className="mt-6 text-center text-xs text-gray-400">
          <p>Dashboard SAEB 2025 - Resultados preliminares</p>
          <p className="mt-1">
            Fórmula: <strong>Nota SAEB = [(Média LP + Média MAT) / 2] ÷ 50 × Taxa de Fluxo</strong>
          </p>
          <p className="mt-1">
            Níveis de proficiência baseados nas escalas oficiais do INEP | Taxa de fluxo padrão: 100% (verde)
          </p>
        </div>
      </div>
    </div>
  );
}