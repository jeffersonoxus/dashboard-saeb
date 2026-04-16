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
  pontos: string;
}

export default function Home() {
  const [dados, setDados] = useState<EscolaSAEB[]>([]);
  const [etapa, setEtapa] = useState<'5º' | '9º'>('5º');
  const [taxaFluxo, setTaxaFluxo] = useState(1);
  
  // States para o modal de código
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [codigoErro, setCodigoErro] = useState('');
  const [codigoVerificado, setCodigoVerificado] = useState(false);
  const [mostrarDadosRede, setMostrarDadosRede] = useState(false);
  
  // States para a calculadora pública
  const [proficienciaLP, setProficienciaLP] = useState<number>(194.24);
  const [proficienciaMAT, setProficienciaMAT] = useState<number>(201.12);
  const [fluxoPersonalizado, setFluxoPersonalizado] = useState<number>(1);
  const [resultadoCalculadora, setResultadoCalculadora] = useState<{
    notaLP: number;
    notaMAT: number;
    notaFinal: number;
    nivelLP: NivelProficiencia | null;
    nivelMAT: NivelProficiencia | null;
    mediaGeral: number;
  }>({
    notaLP: 0,
    notaMAT: 0,
    notaFinal: 0,
    nivelLP: null,
    nivelMAT: null,
    mediaGeral: 0
  });

  // Parâmetros oficiais SAEB 2023
  const parametrosOficiais = {
    '5º': {
      notaMedia: 5.33,
      proficienciaLP: 194.24,
      proficienciaMAT: 201.12,
      fluxo: 1.0,
      descricao: 'Anos Iniciais - SAEB 2023'
    },
    '9º': {
      notaMedia: 4.52,
      proficienciaLP: 238.82,
      proficienciaMAT: 232.53,
      fluxo: 0.95,
      descricao: 'Anos Finais - SAEB 2023'
    }
  };

  // ============================================
  // FÓRMULAS OFICIAIS DA NOTA TÉCNICA
  // ============================================
  
  // Fórmula para 9º ano (Anos Finais)
  // Nota = [(Proficiência - Mínimo) / (Máximo - Mínimo)] × 10
  const converterProficiencia9ano = (proficiencia: number): number => {
    const MIN = 100;
    const MAX = 400;
    
    // Garantir que a proficiência esteja dentro dos limites
    const profLimitada = Math.min(MAX, Math.max(MIN, proficiencia));
    
    // Fórmula linear
    const nota = ((profLimitada - MIN) / (MAX - MIN)) * 10;
    
    return Number(nota.toFixed(2));
  };
  
  // Fórmula para 5º ano (Anos Iniciais)
  // LP: Nota = [(Prof LP - 49) / (324 - 49)] × 10
  // MAT: Nota = [(Prof MAT - 60) / (322 - 60)] × 10
  const converterProficiencia5anoLP = (proficiencia: number): number => {
    const MIN = 49;
    const MAX = 324;
    
    const profLimitada = Math.min(MAX, Math.max(MIN, proficiencia));
    const nota = ((profLimitada - MIN) / (MAX - MIN)) * 10;
    
    return Number(nota.toFixed(2));
  };
  
  const converterProficiencia5anoMAT = (proficiencia: number): number => {
    const MIN = 60;
    const MAX = 322;
    
    const profLimitada = Math.min(MAX, Math.max(MIN, proficiencia));
    const nota = ((profLimitada - MIN) / (MAX - MIN)) * 10;
    
    return Number(nota.toFixed(2));
  };
  
  const converterProficienciaParaNota = (proficiencia: number, etapa: '5º' | '9º', disciplina: 'LP' | 'MAT'): number => {
    if (etapa === '9º') {
      return converterProficiencia9ano(proficiencia);
    } else {
      if (disciplina === 'LP') {
        return converterProficiencia5anoLP(proficiencia);
      } else {
        return converterProficiencia5anoMAT(proficiencia);
      }
    }
  };

  // ============================================
  // FUNÇÕES DE CLASSIFICAÇÃO COM NÍVEIS OFICIAIS
  // ============================================
  
  const getNivelProficienciaLP = (pontuacao: number, etapa: '5º' | '9º'): NivelProficiencia => {
    if (etapa === '5º') {
      if (pontuacao >= 325) return { nivel: 'Avançado (Nível 9)', cor: 'text-green-700', corFundo: 'bg-green-100', descricao: 'Domínio excelente', pontos: '≥ 325 pts' };
      if (pontuacao >= 300) return { nivel: 'Avançado (Nível 8)', cor: 'text-green-600', corFundo: 'bg-green-50', descricao: 'Domínio muito bom', pontos: '300-324 pts' };
      if (pontuacao >= 275) return { nivel: 'Avançado (Nível 7)', cor: 'text-green-500', corFundo: 'bg-green-50', descricao: 'Domínio bom', pontos: '275-299 pts' };
      if (pontuacao >= 250) return { nivel: 'Avançado (Nível 6)', cor: 'text-teal-600', corFundo: 'bg-teal-50', descricao: 'Acima do esperado', pontos: '250-274 pts' };
      if (pontuacao >= 225) return { nivel: 'Proficiente (Nível 5)', cor: 'text-blue-600', corFundo: 'bg-blue-100', descricao: 'Desempenho adequado', pontos: '225-249 pts' };
      if (pontuacao >= 200) return { nivel: 'Proficiente (Nível 4)', cor: 'text-blue-500', corFundo: 'bg-blue-50', descricao: 'Desempenho satisfatório', pontos: '200-224 pts' };
      if (pontuacao >= 175) return { nivel: 'Básico (Nível 3)', cor: 'text-yellow-600', corFundo: 'bg-yellow-100', descricao: 'Abaixo do esperado', pontos: '175-199 pts' };
      if (pontuacao >= 150) return { nivel: 'Básico (Nível 2)', cor: 'text-yellow-500', corFundo: 'bg-yellow-50', descricao: 'Muito abaixo', pontos: '150-174 pts' };
      return { nivel: 'Insuficiente (Nível 1)', cor: 'text-red-600', corFundo: 'bg-red-100', descricao: 'Crítico', pontos: '0-149 pts' };
    } else {
      if (pontuacao >= 375) return { nivel: 'Avançado (Nível 8)', cor: 'text-green-700', corFundo: 'bg-green-100', descricao: 'Domínio excelente', pontos: '≥ 375 pts' };
      if (pontuacao >= 350) return { nivel: 'Avançado (Nível 7)', cor: 'text-green-600', corFundo: 'bg-green-50', descricao: 'Domínio muito bom', pontos: '350-374 pts' };
      if (pontuacao >= 325) return { nivel: 'Avançado (Nível 6)', cor: 'text-teal-600', corFundo: 'bg-teal-50', descricao: 'Acima do esperado', pontos: '325-349 pts' };
      if (pontuacao >= 300) return { nivel: 'Proficiente (Nível 5)', cor: 'text-blue-600', corFundo: 'bg-blue-100', descricao: 'Desempenho adequado', pontos: '300-324 pts' };
      if (pontuacao >= 275) return { nivel: 'Proficiente (Nível 4)', cor: 'text-blue-500', corFundo: 'bg-blue-50', descricao: 'Desempenho satisfatório', pontos: '275-299 pts' };
      if (pontuacao >= 250) return { nivel: 'Básico (Nível 3)', cor: 'text-yellow-600', corFundo: 'bg-yellow-100', descricao: 'Abaixo do esperado', pontos: '250-274 pts' };
      if (pontuacao >= 225) return { nivel: 'Básico (Nível 2)', cor: 'text-yellow-500', corFundo: 'bg-yellow-50', descricao: 'Muito abaixo', pontos: '225-249 pts' };
      if (pontuacao >= 200) return { nivel: 'Básico (Nível 1)', cor: 'text-orange-500', corFundo: 'bg-orange-50', descricao: 'Abaixo do básico', pontos: '200-224 pts' };
      return { nivel: 'Insuficiente (Nível 0)', cor: 'text-red-600', corFundo: 'bg-red-100', descricao: 'Crítico', pontos: '0-199 pts' };
    }
  };

  const getNivelProficienciaMAT = (pontuacao: number, etapa: '5º' | '9º'): NivelProficiencia => {
    if (etapa === '5º') {
      if (pontuacao >= 350) return { nivel: 'Avançado (Nível 10)', cor: 'text-green-700', corFundo: 'bg-green-100', descricao: 'Domínio excelente', pontos: '≥ 350 pts' };
      if (pontuacao >= 325) return { nivel: 'Avançado (Nível 9)', cor: 'text-green-600', corFundo: 'bg-green-50', descricao: 'Domínio muito bom', pontos: '325-349 pts' };
      if (pontuacao >= 300) return { nivel: 'Avançado (Nível 8)', cor: 'text-teal-600', corFundo: 'bg-teal-50', descricao: 'Acima do esperado', pontos: '300-324 pts' };
      if (pontuacao >= 275) return { nivel: 'Avançado (Nível 7)', cor: 'text-green-500', corFundo: 'bg-green-50', descricao: 'Domínio bom', pontos: '275-299 pts' };
      if (pontuacao >= 250) return { nivel: 'Proficiente (Nível 6)', cor: 'text-blue-600', corFundo: 'bg-blue-100', descricao: 'Desempenho adequado', pontos: '250-274 pts' };
      if (pontuacao >= 225) return { nivel: 'Proficiente (Nível 5)', cor: 'text-blue-500', corFundo: 'bg-blue-50', descricao: 'Desempenho satisfatório', pontos: '225-249 pts' };
      if (pontuacao >= 200) return { nivel: 'Básico (Nível 4)', cor: 'text-yellow-600', corFundo: 'bg-yellow-100', descricao: 'Abaixo do esperado', pontos: '200-224 pts' };
      if (pontuacao >= 175) return { nivel: 'Básico (Nível 3)', cor: 'text-yellow-500', corFundo: 'bg-yellow-50', descricao: 'Muito abaixo', pontos: '175-199 pts' };
      if (pontuacao >= 150) return { nivel: 'Insuficiente (Nível 2)', cor: 'text-orange-500', corFundo: 'bg-orange-50', descricao: 'Crítico', pontos: '150-174 pts' };
      if (pontuacao >= 125) return { nivel: 'Insuficiente (Nível 1)', cor: 'text-red-500', corFundo: 'bg-red-50', descricao: 'Muito crítico', pontos: '125-149 pts' };
      return { nivel: 'Insuficiente (Nível 0)', cor: 'text-red-600', corFundo: 'bg-red-100', descricao: 'Extremamente crítico', pontos: '0-124 pts' };
    } else {
      if (pontuacao >= 400) return { nivel: 'Avançado (Nível 9)', cor: 'text-green-700', corFundo: 'bg-green-100', descricao: 'Domínio excelente', pontos: '≥ 400 pts' };
      if (pontuacao >= 375) return { nivel: 'Avançado (Nível 8)', cor: 'text-green-600', corFundo: 'bg-green-50', descricao: 'Domínio muito bom', pontos: '375-399 pts' };
      if (pontuacao >= 350) return { nivel: 'Avançado (Nível 7)', cor: 'text-teal-600', corFundo: 'bg-teal-50', descricao: 'Acima do esperado', pontos: '350-374 pts' };
      if (pontuacao >= 325) return { nivel: 'Proficiente (Nível 6)', cor: 'text-blue-600', corFundo: 'bg-blue-100', descricao: 'Desempenho adequado', pontos: '325-349 pts' };
      if (pontuacao >= 300) return { nivel: 'Proficiente (Nível 5)', cor: 'text-blue-500', corFundo: 'bg-blue-50', descricao: 'Desempenho satisfatório', pontos: '300-324 pts' };
      if (pontuacao >= 275) return { nivel: 'Básico (Nível 4)', cor: 'text-yellow-600', corFundo: 'bg-yellow-100', descricao: 'Abaixo do esperado', pontos: '275-299 pts' };
      if (pontuacao >= 250) return { nivel: 'Básico (Nível 3)', cor: 'text-yellow-500', corFundo: 'bg-yellow-50', descricao: 'Muito abaixo', pontos: '250-274 pts' };
      if (pontuacao >= 225) return { nivel: 'Básico (Nível 2)', cor: 'text-orange-500', corFundo: 'bg-orange-50', descricao: 'Abaixo do básico', pontos: '225-249 pts' };
      if (pontuacao >= 200) return { nivel: 'Insuficiente (Nível 1)', cor: 'text-red-500', corFundo: 'bg-red-50', descricao: 'Crítico', pontos: '200-224 pts' };
      return { nivel: 'Insuficiente (Nível 0)', cor: 'text-red-600', corFundo: 'bg-red-100', descricao: 'Muito crítico', pontos: '0-199 pts' };
    }
  };

  // Atualizar calculadora quando os inputs mudarem
  useEffect(() => {
    const notaLP = converterProficienciaParaNota(proficienciaLP, etapa, 'LP');
    const notaMAT = converterProficienciaParaNota(proficienciaMAT, etapa, 'MAT');
    const notaFinal = (notaLP + notaMAT) / 2 * fluxoPersonalizado;
    const mediaGeral = (proficienciaLP + proficienciaMAT) / 2;
    const nivelLP = getNivelProficienciaLP(proficienciaLP, etapa);
    const nivelMAT = getNivelProficienciaMAT(proficienciaMAT, etapa);
    
    setResultadoCalculadora({
      notaLP,
      notaMAT,
      notaFinal,
      nivelLP,
      nivelMAT,
      mediaGeral
    });
  }, [proficienciaLP, proficienciaMAT, fluxoPersonalizado, etapa]);

  useEffect(() => {
    // Carregar dados do JSON
    fetch('/saeb.json')
      .then(res => res.json())
      .then(data => {
        setDados(data);
      })
      .catch(error => {
        console.error('Erro ao carregar dados:', error);
      });
  }, []);

  const verificarCodigo = () => {
    if (codigo === 'DIEN2026%') {
      setShowCodeModal(false);
      setCodigoVerificado(true);
      setMostrarDadosRede(true);
      sessionStorage.setItem('dien_verified', 'true');
      setCodigoErro('');
    } else {
      setCodigoErro('Código incorreto. Tente novamente.');
      setCodigo('');
    }
  };

  const abrirModalSenha = () => {
    setShowCodeModal(true);
    setCodigo('');
    setCodigoErro('');
  };

  const voltarParaCalculadora = () => {
    setMostrarDadosRede(false);
    setCodigoVerificado(false);
    sessionStorage.removeItem('dien_verified');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      verificarCodigo();
    }
  };

  // Dados da rede filtrados
  const dadosFiltrados = dados.filter(d => d.etapa === etapa);
  const mediaRedeLP = dadosFiltrados.reduce((acc, d) => acc + d.lp, 0) / (dadosFiltrados.length || 1);
  const mediaRedeMAT = dadosFiltrados.reduce((acc, d) => acc + d.mat, 0) / (dadosFiltrados.length || 1);
  
  const notaRedeLP = converterProficienciaParaNota(mediaRedeLP, etapa, 'LP');
  const notaRedeMAT = converterProficienciaParaNota(mediaRedeMAT, etapa, 'MAT');
  const notaRede = (notaRedeLP + notaRedeMAT) / 2 * taxaFluxo;
  
  const nivelRedeLP = getNivelProficienciaLP(mediaRedeLP, etapa);
  const nivelRedeMAT = getNivelProficienciaMAT(mediaRedeMAT, etapa);

  // Dados para o gráfico
  const dadosGrafico = dadosFiltrados.map(d => {
    const notaLP = converterProficienciaParaNota(d.lp, etapa, 'LP');
    const notaMAT = converterProficienciaParaNota(d.mat, etapa, 'MAT');
    const notaEscola = (notaLP + notaMAT) / 2 * taxaFluxo;
    
    return {
      escola: d.escola.length > 35 ? d.escola.substring(0, 32) + '...' : d.escola,
      'Português': Math.round(d.lp),
      'Matemática': Math.round(d.mat),
      'Nota SAEB': Number(notaEscola.toFixed(2))
    };
  }).sort((a, b) => b['Nota SAEB'] - a['Nota SAEB']);

  // ============================================
  // RENDERIZAÇÃO DO MODAL
  // ============================================
  
  if (showCodeModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
        <div className="relative max-w-md w-full">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-purple-600 rounded-3xl blur-2xl opacity-20 animate-pulse"></div>
          
          <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-purple-300 via-purple-500 to-indigo-500"></div>
            
            <div className="p-8">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
              
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  Acesso Restrito - DIEN
                </h2>
                <p className="text-gray-500 text-sm">
                  Digite o código de acesso para visualizar os dados completos da rede municipal de Rio Largo 2025.
                </p>
              </div>
              
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
              
              <button
                onClick={verificarCodigo}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
              >
                Verificar Acesso
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDERIZAÇÃO PRINCIPAL
  // ============================================

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cabeçalho */}
      <div className="bg-gradient-to-r from-blue-800 to-indigo-800 text-white p-6 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold">📊 Dashboard SAEB 2025 - Rio Largo</h1>
          <p className="text-blue-200 mt-2">
            {!mostrarDadosRede 
              ? 'Calculadora de Nota Padronizada (0-10) com base nas proficiências SAEB'
              : `Dados da Rede Municipal - ${etapa === '5º' ? 'Anos Iniciais' : 'Anos Finais'}`
            }
          </p>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        
        {/* CALCULADORA PÚBLICA - só mostra se não estiver nos dados da rede */}
        {!mostrarDadosRede && (
          <>
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">📱 Calculadora SAEB</h2>
                  <p className="text-gray-500 text-sm mt-1">
                    Insira as proficiências e veja a nota padronizada (0-10)
                  </p>
                </div>
                <div className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full">
                  Simulação
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Etapa */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Etapa de Ensino
                  </label>
                  <select
                    value={etapa}
                    onChange={(e) => setEtapa(e.target.value as '5º' | '9º')}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="5º">5º Ano - Anos Iniciais</option>
                    <option value="9º">9º Ano - Anos Finais</option>
                  </select>
                </div>

                {/* Proficiência LP */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    📖 Proficiência em Português
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={proficienciaLP}
                    onChange={(e) => setProficienciaLP(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">Pontuação SAEB (0-500)</p>
                </div>

                {/* Proficiência MAT */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    🔢 Proficiência em Matemática
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={proficienciaMAT}
                    onChange={(e) => setProficienciaMAT(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">Pontuação SAEB (0-500)</p>
                </div>

                {/* Fluxo */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    📈 Taxa de Fluxo (Aprovação)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={fluxoPersonalizado}
                    onChange={(e) => setFluxoPersonalizado(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">Ex: 0.95 = 95% de aprovação</p>
                </div>
              </div>

              {/* Resultados da Calculadora */}
              <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Nota Padronizada - LP</p>
                    <p className={`text-3xl font-bold mt-2 ${
                      resultadoCalculadora.notaLP >= 7 ? 'text-green-600' :
                      resultadoCalculadora.notaLP >= 5 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {resultadoCalculadora.notaLP.toFixed(2)}
                    </p>
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-gray-500">Nota Padronizada - MAT</p>
                    <p className={`text-3xl font-bold mt-2 ${
                      resultadoCalculadora.notaMAT >= 7 ? 'text-green-600' :
                      resultadoCalculadora.notaMAT >= 5 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {resultadoCalculadora.notaMAT.toFixed(2)}
                    </p>
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-gray-500">Nota Final (com fluxo)</p>
                    <p className={`text-4xl font-bold mt-2 ${
                      resultadoCalculadora.notaFinal >= 7 ? 'text-green-600' :
                      resultadoCalculadora.notaFinal >= 5 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {resultadoCalculadora.notaFinal.toFixed(2)}
                    </p>
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-gray-500">Média Geral (LP+MAT)/2</p>
                    <p className="text-2xl font-bold text-gray-800 mt-2">
                      {Math.round(resultadoCalculadora.mediaGeral)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Pontuação bruta SAEB</p>
                  </div>
                </div>

                

                {/* Níveis de Proficiência */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-blue-200">
                  <div className={`${resultadoCalculadora.nivelLP?.corFundo} p-4 rounded-lg`}>
                    <p className="text-sm font-semibold">📖 Português - {resultadoCalculadora.nivelLP?.nivel}</p>
                    <p className="text-2xl font-bold mt-1">{Math.round(proficienciaLP)} pts</p>
                    <p className="text-xs mt-1">{resultadoCalculadora.nivelLP?.pontos}</p>
                  </div>
                  <div className={`${resultadoCalculadora.nivelMAT?.corFundo} p-4 rounded-lg`}>
                    <p className="text-sm font-semibold">🔢 Matemática - {resultadoCalculadora.nivelMAT?.nivel}</p>
                    <p className="text-2xl font-bold mt-1">{Math.round(proficienciaMAT)} pts</p>
                    <p className="text-xs mt-1">{resultadoCalculadora.nivelMAT?.pontos}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Parâmetros Oficiais SAEB 2023 */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 mb-8 border border-green-200">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="text-green-600">⭐</span> Parâmetros Oficiais - SAEB 2023
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-blue-700">5º Ano - Anos Iniciais</h4>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Fluxo: 100%</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-800">{parametrosOficiais['5º'].notaMedia}</p>
                  <p className="text-sm text-gray-500 mt-1">Nota padronizada média</p>
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-sm">📖 Português: <strong>{parametrosOficiais['5º'].proficienciaLP} pts</strong></p>
                    <p className="text-sm mt-1">🔢 Matemática: <strong>{parametrosOficiais['5º'].proficienciaMAT} pts</strong></p>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-purple-700">9º Ano - Anos Finais</h4>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">Fluxo: 95%</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-800">{parametrosOficiais['9º'].notaMedia}</p>
                  <p className="text-sm text-gray-500 mt-1">Nota padronizada média</p>
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-sm">📖 Português: <strong>{parametrosOficiais['9º'].proficienciaLP} pts</strong></p>
                    <p className="text-sm mt-1">🔢 Matemática: <strong>{parametrosOficiais['9º'].proficienciaMAT} pts</strong></p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-4 text-center">
                Fonte: Resultados SAEB 2023 - Rede Municipal
              </p>
            </div>

            {/* Botão para dados da rede */}
            <div className="flex justify-center mb-8">
              <button
                onClick={abrirModalSenha}
                className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:from-green-700 hover:to-emerald-700 transition-all flex items-center gap-3"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Conferir Dados da Rede Municipal
              </button>
            </div>
          </>
        )}

        {/* DADOS DA REDE (somente após senha) */}
        {mostrarDadosRede && (
          <>
            {/* Botão Voltar */}
            <div className="mb-6">
              <button
                onClick={voltarParaCalculadora}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Voltar para Calculadora
              </button>
            </div>

            {/* Cards da Rede */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">🏫 Dados da Rede Municipal</h2>
              <p className="text-gray-500 text-sm mb-6">
                Resultados consolidados por etapa de ensino - SAEB 2023
              </p>

              <div className="flex gap-4 mb-6">
                <button
                  onClick={() => setEtapa('5º')}
                  className={`px-6 py-2 rounded-lg font-semibold transition ${
                    etapa === '5º' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Anos Iniciais (5º ano)
                </button>
                <button
                  onClick={() => setEtapa('9º')}
                  className={`px-6 py-2 rounded-lg font-semibold transition ${
                    etapa === '9º' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Anos Finais (9º ano)
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Média Português</p>
                  <p className="text-2xl font-bold text-blue-700">{Math.round(mediaRedeLP)} pts</p>
                  <p className="text-xs text-gray-500 mt-1">{nivelRedeLP?.nivel}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Média Matemática</p>
                  <p className="text-2xl font-bold text-green-700">{Math.round(mediaRedeMAT)} pts</p>
                  <p className="text-xs text-gray-500 mt-1">{nivelRedeMAT?.nivel}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Nota Padronizada LP</p>
                  <p className="text-xl font-bold text-purple-700">{notaRedeLP.toFixed(2)}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Nota Padronizada MAT</p>
                  <p className="text-xl font-bold text-purple-700">{notaRedeMAT.toFixed(2)}</p>
                </div>
                <div className={`p-4 rounded-lg ${
                  notaRede >= 7 ? 'bg-green-100' : notaRede >= 5 ? 'bg-yellow-100' : 'bg-red-100'
                }`}>
                  <p className="text-sm text-gray-600">Nota SAEB Final</p>
                  <p className={`text-3xl font-bold ${
                    notaRede >= 7 ? 'text-green-700' : notaRede >= 5 ? 'text-yellow-700' : 'text-red-700'
                  }`}>
                    {notaRede.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Fluxo: {Math.round(taxaFluxo * 100)}%</p>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Ajustar Taxa de Fluxo da Rede
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={taxaFluxo}
                  onChange={(e) => setTaxaFluxo(Number(e.target.value))}
                  className="w-full"
                />
                <p className="text-center text-sm text-gray-600 mt-2">
                  Fluxo atual: {Math.round(taxaFluxo * 100)}%
                </p>
              </div>
            </div>

            {/* Gráfico por Escola */}
            {dadosGrafico.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                <h2 className="text-xl font-bold text-gray-800 mb-4">
                  🏆 Ranking das Escolas - Nota SAEB (0-10)
                </h2>
                <ResponsiveContainer width="100%" height={500}>
                  <BarChart 
                    data={dadosGrafico} 
                    layout="vertical" 
                    margin={{ left: 120, right: 30, top: 20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 10]} tickCount={11} />
                    <YAxis type="category" dataKey="escola" width={250} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Nota SAEB" fill="#6366f1" radius={[0, 4, 4, 0]}>
                      {dadosGrafico.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry['Nota SAEB'] >= 7 ? '#22c55e' : entry['Nota SAEB'] >= 5 ? '#eab308' : '#ef4444'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Tabela de Escolas */}
            {dadosFiltrados.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">📋 Detalhamento por Escola</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Escola</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">LP (pts)</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nota LP</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">MAT (pts)</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nota MAT</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nota Final</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Alunos</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {dadosFiltrados.map((escola, idx) => {
                        const notaLPEscola = converterProficienciaParaNota(escola.lp, etapa, 'LP');
                        const notaMATEscola = converterProficienciaParaNota(escola.mat, etapa, 'MAT');
                        const notaFinalEscola = (notaLPEscola + notaMATEscola) / 2 * taxaFluxo;
                        
                        return (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm text-gray-900">{escola.escola}</td>
                            <td className="px-6 py-4 text-sm">{Math.round(escola.lp)}</td>
                            <td className="px-6 py-4 text-sm font-medium">{notaLPEscola.toFixed(2)}</td>
                            <td className="px-6 py-4 text-sm">{Math.round(escola.mat)}</td>
                            <td className="px-6 py-4 text-sm font-medium">{notaMATEscola.toFixed(2)}</td>
                            <td className={`px-6 py-4 text-sm font-bold ${
                              notaFinalEscola >= 7 ? 'text-green-600' : notaFinalEscola >= 5 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {notaFinalEscola.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">{escola.alunos_presentes}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* Tabela de Referência de Níveis - mostra sempre */}
        <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">📖 Tabela de Referência - Níveis de Proficiência SAEB</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 5º Ano */}
            <div>
              <h4 className="font-bold text-blue-700 mb-2">5º Ano - Língua Portuguesa</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span>Avançado (Nível 9):</span><span>≥ 325 pts</span></div>
                <div className="flex justify-between"><span>Avançado (Nível 8):</span><span>300-324 pts</span></div>
                <div className="flex justify-between"><span>Avançado (Nível 7):</span><span>275-299 pts</span></div>
                <div className="flex justify-between"><span>Avançado (Nível 6):</span><span>250-274 pts</span></div>
                <div className="flex justify-between"><span>Proficiente (Nível 5):</span><span>225-249 pts</span></div>
                <div className="flex justify-between"><span>Proficiente (Nível 4):</span><span>200-224 pts</span></div>
                <div className="flex justify-between"><span>Básico (Nível 3):</span><span>175-199 pts</span></div>
                <div className="flex justify-between"><span>Básico (Nível 2):</span><span>150-174 pts</span></div>
                <div className="flex justify-between"><span>Insuficiente (Nível 1):</span><span>0-149 pts</span></div>
              </div>
              
              <h4 className="font-bold text-green-700 mt-4 mb-2">5º Ano - Matemática</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span>Avançado (Nível 10):</span><span>≥ 350 pts</span></div>
                <div className="flex justify-between"><span>Avançado (Nível 9):</span><span>325-349 pts</span></div>
                <div className="flex justify-between"><span>Avançado (Nível 8):</span><span>300-324 pts</span></div>
                <div className="flex justify-between"><span>Avançado (Nível 7):</span><span>275-299 pts</span></div>
                <div className="flex justify-between"><span>Proficiente (Nível 6):</span><span>250-274 pts</span></div>
                <div className="flex justify-between"><span>Proficiente (Nível 5):</span><span>225-249 pts</span></div>
                <div className="flex justify-between"><span>Básico (Nível 4):</span><span>200-224 pts</span></div>
                <div className="flex justify-between"><span>Básico (Nível 3):</span><span>175-199 pts</span></div>
                <div className="flex justify-between"><span>Insuficiente (Nível 2):</span><span>150-174 pts</span></div>
                <div className="flex justify-between"><span>Insuficiente (Nível 1):</span><span>125-149 pts</span></div>
                <div className="flex justify-between"><span>Insuficiente (Nível 0):</span><span>0-124 pts</span></div>
              </div>
            </div>

            {/* 9º Ano */}
            <div>
              <h4 className="font-bold text-blue-700 mb-2">9º Ano - Língua Portuguesa</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span>Avançado (Nível 8):</span><span>≥ 375 pts</span></div>
                <div className="flex justify-between"><span>Avançado (Nível 7):</span><span>350-374 pts</span></div>
                <div className="flex justify-between"><span>Avançado (Nível 6):</span><span>325-349 pts</span></div>
                <div className="flex justify-between"><span>Proficiente (Nível 5):</span><span>300-324 pts</span></div>
                <div className="flex justify-between"><span>Proficiente (Nível 4):</span><span>275-299 pts</span></div>
                <div className="flex justify-between"><span>Básico (Nível 3):</span><span>250-274 pts</span></div>
                <div className="flex justify-between"><span>Básico (Nível 2):</span><span>225-249 pts</span></div>
                <div className="flex justify-between"><span>Básico (Nível 1):</span><span>200-224 pts</span></div>
                <div className="flex justify-between"><span>Insuficiente (Nível 0):</span><span>0-199 pts</span></div>
              </div>
              
              <h4 className="font-bold text-green-700 mt-4 mb-2">9º Ano - Matemática</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span>Avançado (Nível 9):</span><span>≥ 400 pts</span></div>
                <div className="flex justify-between"><span>Avançado (Nível 8):</span><span>375-399 pts</span></div>
                <div className="flex justify-between"><span>Avançado (Nível 7):</span><span>350-374 pts</span></div>
                <div className="flex justify-between"><span>Proficiente (Nível 6):</span><span>325-349 pts</span></div>
                <div className="flex justify-between"><span>Proficiente (Nível 5):</span><span>300-324 pts</span></div>
                <div className="flex justify-between"><span>Básico (Nível 4):</span><span>275-299 pts</span></div>
                <div className="flex justify-between"><span>Básico (Nível 3):</span><span>250-274 pts</span></div>
                <div className="flex justify-between"><span>Básico (Nível 2):</span><span>225-249 pts</span></div>
                <div className="flex justify-between"><span>Insuficiente (Nível 1):</span><span>200-224 pts</span></div>
                <div className="flex justify-between"><span>Insuficiente (Nível 0):</span><span>0-199 pts</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className="mt-8 text-center text-xs text-gray-400">
          <p>Baseado na Nota Técnica Oficial do INEP</p>
          <p>Desenvolvido por Jefferson</p>
        </div>
      </div>
    </div>
  );
}