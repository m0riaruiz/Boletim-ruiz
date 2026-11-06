// Configuração fixa do aluno
const CONFIG_ALUNO = {
  turma: "9B",
  numeroChamada: 23,
  apiUrl: "https://boletim-api.profbt.com.br"
};

// Variável de sessão para guardar o PIN apenas em memória enquanto o site estiver aberto
let pinSessao = "";
let emModoEdicao = false;

// Dados fictícios padronizados para o 9º Ano
let disciplinasBoletim = [
  { disciplina: "Língua Portuguesa", tri1: 78, tri2: "8,2", tri3: 8.6, faltas: [2, 2, 1] },
  { disciplina: "Matemática", tri1: 55, tri2: "5,4", tri3: null, faltas: [3, 2, 2] },
  { disciplina: "Ciências", tri1: 84, tri2: 7.9, tri3: "8,3", faltas: [1, 1, 1] },
  { disciplina: "História", tri1: "7,1", tri2: 82, tri3: null, faltas: [1, 2, 1] },
  { disciplina: "Geografia", tri1: 69, tri2: "7,5", tri3: 7.8, faltas: [0, 1, 1] },
  { disciplina: "Língua Inglesa", tri1: 88, tri2: 8.4, tri3: null, faltas: [1, 0, 1] },
  { disciplina: "Arte", tri1: "9,2", tri2: 87, tri3: 9.0, faltas: [1, 1, 0] },
  { disciplina: "Educação Física", tri1: 96, tri2: "9,3", tri3: null, faltas: [0, 1, 0] },
  { disciplina: "Educação Digital", tri1: 91, tri2: 8.9, tri3: "9,4", faltas: [1, 1, 0] },
  { disciplina: "Educação Financeira", tri1: 76, tri2: "7,2", tri3: null, faltas: [1, 1, 1] },
  { disciplina: "Rec. Aprend. Matemática", tri1: 58, tri2: "5,9", tri3: 6.2, faltas: [2, 2, 1] },
  { disciplina: "Leitura Rec. Aprend. Lingua Portuguesa", tri1: 72, tri2: "7,6", tri3: null, faltas: [2, 1, 1] },
  { disciplina: "Pensamento Lógico", tri1: 49, tri2: 5.5, tri3: "5,8", faltas: [2, 2, 2] },
  { disciplina: "Literatura Arte e Movimento", tri1: "8,0", tri2: 84, tri3: null, faltas: [1, 1, 0] },
  { disciplina: "Práticas Experimentais", tri1: 64, tri2: "6,6", tri3: 7.0, faltas: [1, 1, 1] }
];

// Elementos do DOM (Document Object Model - a estrutura do HTML acessada pelo JavaScript)
const formLogin = document.getElementById("form-login");
const inputPin = document.getElementById("input-pin");
const mensagemLogin = document.getElementById("mensagem-login");
const secaoLogin = document.getElementById("secao-login");
const conteudoBoletim = document.getElementById("conteudo-boletim");
const tabelaCorpo = document.getElementById("tabela-corpo");
const btnAlternarEdicao = document.getElementById("btn-alternar-edicao");
const btnSalvar = document.getElementById("btn-salvar");
const mensagemStatusBoletim = document.getElementById("mensagem-status-boletim");

// Função para normalizar notas recebidas dos dados antigos/locais (escala de 0 a 10)
function normalizarNota(valor) {
  if (valor === null || valor === undefined || valor === "") {
    return null;
  }
  
  if (typeof valor === "string") {
    valor = valor.replace(",", ".");
  }

  let num = Number(valor);
  if (isNaN(num)) {
    return null;
  }

  if (num >= 0 && num <= 10) {
    return num;
  } else if (num > 10 && num <= 100) {
    return num / 10;
  }

  return null;
}

// Evento de envio do formulário de login (Entrar com PIN)
formLogin.addEventListener("submit", function (e) {
  e.preventDefault();
  const pinDigitado = inputPin.value.trim();
  if (!pinDigitado) return;

  mensagemLogin.textContent = "Conectando...";
  mensagemLogin.className = "mensagem-status";

  // Comunicação via API para abrir o boletim
  fetch(`${CONFIG_ALUNO.apiUrl}/api/v1/boletins/abrir`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      turma: CONFIG_ALUNO.turma,
      numero_chamada: CONFIG_ALUNO.numeroChamada,
      pin: pinDigitado
    })
  })
    .then(response => {
      if (response.status === 401) {
        throw new Error("Turma, chamada ou PIN inválidos.");
      } else if (response.status === 429) {
        throw new Error("Muitas tentativas. Aguarde um minuto e tente novamente.");
      } else if (!response.ok) {
        throw new Error("Não foi possível conectar ao servidor. Tente novamente.");
      }
      return response.json();
    })
    .then(data => {
      // Guarda o PIN na memória da sessão e limpa o campo no HTML por segurança
      pinSessao = pinDigitado;
      inputPin.value = "";
      mensagemLogin.textContent = "";

      // Regra: DADOS DA API > DADOS LOCAIS
      if (data && data.dados && Array.isArray(data.dados.disciplinas)) {
        disciplinasBoletim = data.dados.disciplinas;
      }

      secaoLogin.classList.add("oculto");
      conteudoBoletim.classList.remove("oculto");
      renderizarBoletim();
    })
    .catch(err => {
      mensagemLogin.textContent = err.message || "Não foi possível conectar ao servidor. Tente novamente.";
      mensagemLogin.className = "mensagem-status erro";
    });
});

// Atualiza e desenha a tabela e os cards de resumo na tela
function renderizarBoletim() {
  tabelaCorpo.innerHTML = ""; // Limpa a tabela antes de preencher

  let somaMedias = 0;
  let qtdDisciplinasComMedia = 0;
  let totalFaltasGeral = 0;
  let qtdBomDesempenho = 0;
  let qtdAtencao = 0;

  // forEach: percorre cada objeto de disciplina no array
  disciplinasBoletim.forEach((item, index) => {
    // Normalização das notas dos trimestres
    const t1 = normalizarNota(item.tri1);
    const t2 = normalizarNota(item.tri2);
    const t3 = normalizarNota(item.tri3);

    // Cálculo da média ignorando notas ausentes (não transforma ausente em zero)
    let notasValidas = [];
    if (t1 !== null) notasValidas.push(t1);
    if (t2 !== null) notasValidas.push(t2);
    if (t3 !== null) notasValidas.push(t3);

    let media = null;
    if (notasValidas.length > 0) {
      let soma = notasValidas.reduce((acc, curr) => acc + curr, 0);
      media = soma / notasValidas.length;
      somaMedias += media;
      qtdDisciplinasComMedia++;
    }

    // Soma das faltas da disciplina
    let faltasArray = Array.isArray(item.faltas) ? item.faltas : [0, 0, 0];
    let somaFaltasDisc = faltasArray.reduce((acc, curr) => acc + (Number(curr) || 0), 0);
    totalFaltasGeral += somaFaltasDisc;

    // Definição da situação por disciplina
    let situacaoTexto = "Nota ainda não disponível";
    let situacaoClasse = "situacao-indisponivel";

    if (media !== null) {
      if (media >= 6.0) {
        situacaoTexto = "Bom desempenho";
        situacaoClasse = "situacao-bom";
        qtdBomDesempenho++;
      } else {
        situacaoTexto = "Atenção";
        situacaoClasse = "situacao-atencao";
        qtdAtencao++;
      }
    }

    // Construção das células da tabela via DOM de forma segura
    const tr = document.createElement("tr");

    const tdNome = document.createElement("td");
    tdNome.textContent = item.disciplina; // textContent garante segurança contra injeções
    tr.appendChild(tdNome);

    if (!emModoEdicao) {
      const tdT1 = document.createElement("td");
      tdT1.textContent = t1 !== null ? t1.toFixed(1).replace(".", ",") : "—";
      tr.appendChild(tdT1);

      const tdT2 = document.createElement("td");
      tdT2.textContent = t2 !== null ? t2.toFixed(1).replace(".", ",") : "—";
      tr.appendChild(tdT2);

      const tdT3 = document.createElement("td");
      tdT3.textContent = t3 !== null ? t3.toFixed(1).replace(".", ",") : "—";
      tr.appendChild(tdT3);

      const tdMedia = document.createElement("td");
      tdMedia.textContent = media !== null ? media.toFixed(1).replace(".", ",") : "—";
      tr.appendChild(tdMedia);

      const tdFaltas = document.createElement("td");
      tdFaltas.textContent = somaFaltasDisc;
      tr.appendChild(tdFaltas);

      const tdSit = document.createElement("td");
      tdSit.textContent = situacaoTexto;
      tdSit.className = situacaoClasse;
      tr.appendChild(tdSit);
    } else {
      // Criação dos campos numéricos para modo de edição
      tr.appendChild(criarTdInput(`n1-${index}`, item.tri1));
      tr.appendChild(criarTdInput(`n2-${index}`, item.tri2));
      tr.appendChild(criarTdInput(`n3-${index}`, item.tri3));

      const tdMedia = document.createElement("td");
      tdMedia.textContent = media !== null ? media.toFixed(1).replace(".", ",") : "—";
      tr.appendChild(tdMedia);

      tr.appendChild(criarTdInputFaltas(`f1-${index}`, faltasArray[0]));

      const tdSit = document.createElement("td");
      tdSit.textContent = situacaoTexto;
      tdSit.className = situacaoClasse;
      tr.appendChild(tdSit);
    }

    tabelaCorpo.appendChild(tr);
  });

  // Atualização dos cards de resumo
  const cardMedia = document.getElementById("card-media-geral");
  if (qtdDisciplinasComMedia > 0) {
    const mediaGeral = somaMedias / qtdDisciplinasComMedia;
    cardMedia.textContent = mediaGeral.toFixed(1).replace(".", ",");
  } else {
    cardMedia.textContent = "—";
  }

  document.getElementById("card-total-faltas").textContent = totalFaltasGeral;
  document.getElementById("card-bom-desempenho").textContent = qtdBomDesempenho;
  document.getElementById("card-atencao").textContent = qtdAtencao;

  // Nota: A frequência percentual abaixo é FICTÍCIA / DEMONSTRATIVA nesta etapa.
  document.getElementById("card-frequencia").textContent = "92%";
}

// Cria célula com campo de entrada de texto/nota
function criarTdInput(id, valorAtual) {
  const td = document.createElement("td");
  const input = document.createElement("input");
  input.type = "text";
  input.id = id;
  const n = normalizarNota(valorAtual);
  input.value = n !== null ? n.toString().replace(".", ",") : "";
  td.appendChild(input);
  return td;
}

// Cria célula com campo de entrada para faltas
function criarTdInputFaltas(id, valorFalta) {
  const td = document.createElement("td");
  const input = document.createElement("input");
  input.type = "number";
  input.id = id;
  input.value = valorFalta !== undefined && valorFalta !== null ? valorFalta : 0;
  td.appendChild(input);
  return td;
}

// Botão para alternar entre modo visualização e edição
btnAlternarEdicao.addEventListener("click", function () {
  emModoEdicao = !emModoEdicao;
  btnAlternarEdicao.textContent = emModoEdicao ? "Cancelar edição" : "Alterar dados";
  if (emModoEdicao) {
    btnSalvar.classList.remove("oculto");
  } else {
    btnSalvar.classList.add("oculto");
    mensagemStatusBoletim.textContent = "";
  }
  renderizarBoletim();
});

// Validação estrita de nota digitada no formulário de edição (0 a 10 ou vazio)
function validarNotaEditada(valorStr) {
  if (!valorStr || valorStr.trim() === "") {
    return { valido: true, valor: null };
  }
  const strLimpa = valorStr.trim().replace(",", ".");
  const num = Number(strLimpa);
  if (isNaN(num) || num < 0 || num > 10) {
    return { valido: false, valor: null };
  }
  return { valido: true, valor: num };
}

// Validação de falta digitada (inteiro >= 0)
function validarFaltaEditada(valorStr) {
  if (valorStr === "" || valorStr === null || valorStr === undefined) {
    return { valido: false, valor: null };
  }
  const num = Number(valorStr);
  if (isNaN(num) || !Number.isInteger(num) || num < 0) {
    return { valido: false, valor: null };
  }
  return { valido: true, valor: num };
}

// Salva alterações via API PUT
btnSalvar.addEventListener("click", function () {
  let comErro = false;
  let novasDisciplinas = [];

  // Remove marcações de erro prévias nos inputs
  document.querySelectorAll("input").forEach(inp => inp.classList.remove("input-invalido"));

  disciplinasBoletim.forEach((item, index) => {
    const inputT1 = document.getElementById(`n1-${index}`);
    const inputT2 = document.getElementById(`n2-${index}`);
    const inputT3 = document.getElementById(`n3-${index}`);
    const inputF1 = document.getElementById(`f1-${index}`);

    const valT1 = validarNotaEditada(inputT1.value);
    const valT2 = validarNotaEditada(inputT2.value);
    const valT3 = validarNotaEditada(inputT3.value);
    const valF1 = validarFaltaEditada(inputF1.value);

    if (!valT1.valido) { inputT1.classList.add("input-invalido"); comErro = true; }
    if (!valT2.valido) { inputT2.classList.add("input-invalido"); comErro = true; }
    if (!valT3.valido) { inputT3.classList.add("input-invalido"); comErro = true; }
    if (!valF1.valido) { inputF1.classList.add("input-invalido"); comErro = true; }

    novasDisciplinas.push({
      disciplina: item.disciplina,
      tri1: valT1.valor,
      tri2: valT2.valor,
      tri3: valT3.valor,
      faltas: [valF1.valor !== null ? valF1.valor : 0, 0, 0]
    });
  });

  if (comErro) {
    mensagemStatusBoletim.textContent = "Verifique os campos destacados em vermelho.";
    mensagemStatusBoletim.className = "mensagem-status erro";
    return;
  }

  mensagemStatusBoletim.textContent = "Salvando...";
  mensagemStatusBoletim.className = "mensagem-status";

  fetch(`${CONFIG_ALUNO.apiUrl}/api/v1/boletins/salvar`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      turma: CONFIG_ALUNO.turma,
      numero_chamada: CONFIG_ALUNO.numeroChamada,
      pin: pinSessao,
      dados: {
        disciplinas: novasDisciplinas
      }
    })
  })
    .then(response => {
      if (!response.ok) {
        throw new Error("Erro ao salvar dados no servidor.");
      }
      return response.json();
    })
    .then(() => {
      disciplinasBoletim = novasDisciplinas;
      emModoEdicao = false;
      btnAlternarEdicao.textContent = "Alterar dados";
      btnSalvar.classList.add("oculto");
      mensagemStatusBoletim.textContent = "Dados salvos com sucesso.";
      mensagemStatusBoletim.className = "mensagem-status sucesso";
      renderizarBoletim();
    })
    .catch(err => {
      mensagemStatusBoletim.textContent = err.message || "Falha ao salvar. Tente novamente.";
      mensagemStatusBoletim.className = "mensagem-status erro";
    });
});