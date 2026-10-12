---
title: Conformidade
sourceHash: 1c16c2c481111ebe772362128cf8f3e800f6e482a5ba14cadcb0f135f1872461
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Conformidade: o que "coincidir" significa

O @knowvah/elk-engine é validado contra o Eclipse ELK (Java) do upstream, compilado a partir do
código-fonte. Um layout em TypeScript é **conforme** ao oráculo quando, depois de ambos serem lidos
como ELK JSON, a estrutura e todo valor não numérico são exatamente iguais e todo número finito
concorda dentro de uma tolerância absoluta de `1e-6`.
O comparador é [`test/golden/compare-json.ts`](https://github.com/knowvah/elk-engine/blob/main/test/golden/compare-json.ts);
este documento descreve o que ele implementa. As regras do port estão em
[`docs/translation-rules.md`](/guide/translation-rules).

| #   | Seção                                                   | Responde                                          |
| --- | ------------------------------------------------------- | ------------------------------------------------- |
| 1   | [Oráculo](#1-oráculo)                                   | O que é "correto", e em qual commit?              |
| 1a  | [Unidade de conformidade](#1a-unidade-de-conformidade)  | O que é um caso, e quais casos existem?           |
| 2   | [Critério de conformidade](#2-critério-de-conformidade) | O que conta como igual?                           |
| 3   | [Goldens e corpus](#3-goldens-e-corpus)                 | De onde vêm as saídas de referência?              |
| 4   | [Patches de seam](#4-patches-de-seam)                   | Como alteramos o oráculo?                         |
| 5   | [Operações do oráculo](#5-operações-do-oráculo-runbook) | O que fazer quando ele quebra?                    |
| 6   | [Gates](#6-gates)                                       | O que precisa passar antes de uma mudança entrar? |

## 1. Oráculo

O oráculo (AD-3) é o ELK do upstream **compilado a partir do código-fonte** em um worktree git
desanexado de `$ELK_SOURCE_DIR`, criado em `$ELK_ORACLE_DIR` por `tools/oracle/build.sh`.
Ambos ficam fora deste repositório; nenhum dos dois é incluído no repositório.

| Item                 | Onde                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------ |
| Commit fixado do ELK | `tools/oracle/ELK_COMMIT` (atualmente `8aaa3c145c2a18a38aabbc725aa3791ddc517a76`)    |
| Série de patches     | `tools/oracle/patches/*.patch`, aplicados em ordem lexical com `git am --3way`       |
| Build                | `tools/oracle/build.sh` (Maven 3.9.x + JDK 21; o Tycho baixa artefatos p2)           |
| Executor em lote     | `tools/oracle/run.sh <outDir> <input>...` ou `run.sh --cases <cases.jsonl> <outDir>` |
| Harness              | `tools/oracle/harness/ElkOracle.java`                                                |
| Manifesto do build   | `$ELK_ORACLE_DIR/oracle-build.json` (commit, patches, JDK, jar por bundle)           |

**Build.** O `build.sh` executa `mvn -P elk-meta clean install -DskipTests` (o compilador melk) e
depois `mvn clean install -DskipTests -Dmaven.test.skip=true` a partir de `build/` no worktree, e em
seguida registra o jar de cada bundle no escopo (`core`, `graph`, `graph.json`, `alg.common` e os
algoritmos `layered`, `mrtree`, `radial`, `force`, `disco`, `rectpacking`, `spore`,
`topdownpacking`, `vertiflex`) em `oracle-build.json`. Um worktree existente só é reaproveitado se
descender de `ELK_COMMIT`, carregar exatamente os assuntos dos patches em
`tools/oracle/patches/` e estiver limpo, exceto pela saída do build; caso contrário,
o `build.sh` termina com `2` e o deixa intocado.

**Run.** O `run.sh` compila `ElkOracle.java` contra os jars dos bundles mais os bundles de terceiros
(Gson, Guava, EMF, bibliotecas Xtext/Xtend) do cache p2 do Tycho
(`P2_BUNDLES`, padrão `~/.m2/repository/p2/osgi/bundle`; a versão mais recente de cada um é usada).
Uma JVM faz o layout de cada entrada com `RecursiveGraphLayoutEngine` e grava
`<outDir>/<input basename>.json` com layout, dimensões zero e posições zero incluídos e opções de
layout desconhecidas omitidas. Uma entrada com falha imprime `ERROR <input>: <message>`; a
JVM termina com `1` se qualquer entrada falhou. Os nomes-base das entradas devem ser únicos dentro de uma
execução, já que o nome de saída é o nome-base.

**Semântica da série de patches.** Hoje a série contém um patch:

| Patch                                                                   | Efeito                                                                                                                                                                                                                                                    | Seam equivalente em TS                                                                                                                             |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0001-graph.json-seedable-JsonExporter-id-collision-random.patch` (D5b) | `JsonExporter` resolve colisões de id com `"_g" + Random.nextInt(1000000)`; o patch inicializa esse `Random` com a propriedade de sistema `org.eclipse.elk.graph.json.exportSeed` (não definida = comportamento do ELK). O `run.sh` passa `EXPORT_SEED=1` | `Random` injetável no port de `graph.json`; pendente até esse port (o shim `Random` em TS já reproduz a sequência: a seed 1 produz 548985, 764588) |

Os patches existem apenas para adicionar seams de escopo restrito que tornem comparáveis os comportamentos
da JVM e do JS; cada um é pareado com um seam do lado TS (seção 4).

**Por que não o elkjs?** O elkjs é o ELK compilado pelo GWT. Ele não pode carregar nossa série de
patches, e a emulação do JRE pelo GWT difere da JVM a partir da qual estamos fazendo o port.
Ele não é consultado como oráculo.

## 1a. Unidade de conformidade

Um **caso** é `(algorithm, model, variant)` (D1). O painel de paridade tem uma linha por
algoritmo de layout; a pasta do elk-models e os recursos do census são filtros, não linhas.

**Id do caso.** `<tier>/<algorithmSuffix>/<variant>/<modelId>`, por exemplo
`native/layered/default/tickets/layered/546_borderGaps`. `algorithmSuffix` é o id do algoritmo
sem `org.eclipse.elk.`. Para modelos gerados, `modelId` é `generated/<name>`.

**Id e origem do modelo (D3).** O id do modelo é o caminho no elk-models sem a extensão.
Um caso lê o `.json` quando existe um, senão o `.elkt`; o `.elkg` (EMF XMI) nunca é lido.

**Variantes (D6).** Sobreposições de opções nomeadas em `test/corpus/variants.json`, aplicadas na raiz:
`default` (nenhuma), `direction-right`, `direction-left`, `direction-down`, `direction-up`,
`hierarchy-separate` (`SEPARATE_CHILDREN`), `hierarchy-include` (`INCLUDE_CHILDREN`).

| Tier         | Algoritmo                                          | Modelos                         | Variantes                |
| ------------ | -------------------------------------------------- | ------------------------------- | ------------------------ |
| native       | o próprio `rootAlgorithm` do modelo                | todo modelo do census           | todas as sete            |
| retarget     | todo algoritmo listado, exceto o do próprio modelo | todo modelo do census           | somente `default` (OR-1) |
| generated    | o algoritmo nomeado pelo prefixo do arquivo        | `test/corpus/generated/*.json`  | todas as sete            |
| ported JUnit | por missão de algoritmo                            | casos JUnit do upstream (AD-13) | conforme portadas        |

`tools/oracle/run.sh --list-algorithms` é a lista de ids de algoritmos (14 hoje).

**Retarget (D2).** O harness define `org.eclipse.elk.algorithm` em **todo nó que tem
filhos**, substituindo qualquer valor declarado, e `org.eclipse.elk.randomSeed = 1` na raiz. O ELK
resolve o algoritmo por nó, e um nó sem valor definido recorre ao layered. Uma raiz sem
filhos recebe apenas a seed. O tier retarget pula o `rootAlgorithm` próprio de cada modelo (o
tier native o cobre).

## 2. Critério de conformidade

AD-4, exatamente como `compareLayout(expected, actual, { tol })` o implementa:

| Regra                     | Comportamento                                                                                                                                                                                   |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tolerância                | Absoluta, `DEFAULT_TOLERANCE = 1e-6`; números finitos passam quando `abs(e - a) <= tol`                                                                                                         |
| Números não finitos       | `NaN` e `±Infinity` devem ser exatamente iguais (`Object.is` ou `===`), mesmo com `tol: Infinity`                                                                                               |
| Strings, booleans, `null` | Estritamente iguais, senão `value`                                                                                                                                                              |
| Incompatibilidade de tipo | Tipos JSON diferentes (`null`, array, objeto, número, string, boolean) geram um único diff `type`                                                                                               |
| Chaves de objeto          | O conjunto de chaves deve ser idêntico: uma chave só em expected é `missing`, só em actual é `extra`                                                                                            |
| Arrays                    | Pareados **por `id`** quando todo elemento de ambos os lados é um objeto com `id` string e os ids são únicos em cada lado (um array vazio conta como indexado); caso contrário, **por posição** |
| Arrays indexados          | Um id em apenas um lado é um diff `structure` em `path[id=<id>]`; a ordem é ignorada                                                                                                            |
| Arrays posicionais        | Uma diferença de tamanho é um único diff `structure` e os elementos não são mais comparados                                                                                                     |
| Tipos de diff             | `structure`, `value`, `type`, `missing`, `extra`; `path` é semelhante a um caminho JSON (`children[id=n1].x`)                                                                                   |

Consequências: ids de elementos, contagens de elementos, topologia das seções de aresta e
contagens de pontos de dobra são exatos porque ids e tamanhos de array são exatos;
coordenadas e tamanhos recebem `1e-6`. `formatDiffs` imprime no máximo 20 diffs.

**Política de divergências conhecidas.** Uma divergência nunca é absorvida elevando `tol`
ou editando um golden (AD-13). Cada uma é registrada aqui com sua causa e o
teste ou fixture que ela afeta. Classes aceitas:

- **Diferenças de `Math.*` no nível de ulp.** O V8 e a JVM podem diferir no último bit
  de `sin`, `cos`, `exp`, `log`, `pow` e afins; o `StrictMath` do Java é
  especificado como exato em bits, o `Math` não. O caso que já ocorreu: `nextGaussian`
  é especificado para usar `StrictMath.log`, então `src/java/util/Random.ts` traz uma
  implementação exata de `StrictMath.log` em vez de `Math.log`. Prefira um port exato em bits do
  algoritmo do `StrictMath` a ampliar a tolerância.
- **Iteração por hash de identidade (AD-10).** Iterar sobre um `HashMap`/`HashSet` com chaves
  de objetos com hash de identidade é não determinístico no próprio Java. Registre o ponto no
  journal e faça o port com ordem de inserção; os goldens não devem depender disso.
  Chaves com hash por valor (String, Integer) devem reproduzir a ordem do Java.
- **`Random` inicializado pelo relógio.** Com `randomSeed = 0`, o ELK inicializa a seed a partir do relógio
  (`core/Core.melk:608`), então a saída não é reproduzível. As entradas dos goldens devem
  deixar a seed indefinida ou diferente de zero (a seed padrão do layered é `1`).

Entradas concretas (adicione uma somente com a aprovação do usuário):

| #   | Divergência                        | Causa                                                                     | Escopo                                                                                                                                                                             | Aprovada                |
| --- | ---------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| 1   | Texto da mensagem de erro de parse | As mensagens do ANTLR são artefatos do parser gerado, que nunca é portado | Entrada de gramática inválida (`.elkt`, `.elkj`, `.elkr`): apenas a _presença_ de uma falha de parse precisa coincidir, não a mensagem. A entrada válida deve coincidir exatamente | D8, usuário, 2026-10-11 |

**Veredictos.** Cada caso recebe um veredicto a partir de duas execuções separadas do oráculo na JVM (D4, D5, OR-2):

| Veredicto          | Significado                                                                                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ok`               | Ambas as execuções fizeram o layout do modelo e os arquivos de saída são idênticos byte a byte                                                                            |
| `throws`           | Ambas as execuções lançaram a mesma exceção: classe exata e mensagem exata depois que `@[0-9a-f]+` vira `@<hash>` (a mensagem pode ser nula, p. ex. `StackOverflowError`) |
| `nondeterministic` | As execuções divergem (bytes de saída, exceção, ou uma `ok` e outra `throws`)                                                                                             |
| `oracle-error`     | Falha do harness (entrada ilegível, variante/algoritmo/opção desconhecidos, linha de resultado perdida); nunca aceitável                                                  |
| `timeout`          | Uma execução excedeu `ELK_SWEEP_TIMEOUT_MS`                                                                                                                               |

Precedência: `oracle-error`, depois `timeout`, depois `ok`/`throws` quando iguais, senão
`nondeterministic`. Antes da comparação byte a byte, todo token `@[0-9a-f]+` em ambas as saídas é
substituído por `@<hash>`, como nas mensagens de exceção (D5a; `sameOutput` em `tools/corpus/sweep.ts`).
Causa: a opção programática `debug.discoGraph` do disco exporta `...DCGraph@<identity hash>`,
que nenhuma seed consegue fixar. O comparador TS aplica a mesma substituição. Os casos não determinísticos
são relatados separadamente e excluídos das contagens de aprovação, em linha com a política de hash
de identidade acima.

Fontes genuínas restantes de `nondeterministic` (comportamento do ELK, não falhas do harness; as contagens estão no
relatório de paridade): spore (`ElkGraphImporter.java:169` introduz jitter com `Math.random`) e `random`
(o `randomSeed` padrão 0 não tem seed em compostos aninhados; o retarget define a seed apenas na raiz, D2,
mantido por decisão do usuário). As renomeações de id `_g<random>` do exportador não são uma fonte: o patch
de seam as corrige.

## 3. Goldens e corpus

AD-5. As saídas de referência são commitadas para que o CI não precise de uma JVM.

| Item                 | Onde                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| Corpus fixado        | `eclipse-elk/elk-models` no `commit` de `test/corpus/manifest.json` (não incluído no repositório) |
| Diretório de modelos | `$ELK_MODELS_DIR`, padrão `../../eclipse-elk/elk-models` relativo a este repositório              |
| Conjunto curado      | `golden[]` em `test/corpus/manifest.json`: `{ id, path, note }`                                   |
| Refs                 | `test/golden/refs/elk/<id>.json`, uma por `id` do manifesto                                       |
| Proveniência         | `test/golden/refs/elk/_meta.json`: `elkCommit`, `patches`, `jdk`, `modelsCommit`, `generatedBy`   |

**Mapeamento de id para caminho.** `golden[].path` é relativo a `$ELK_MODELS_DIR`, e
a entrada é `$ELK_MODELS_DIR/<path>`. O `regen-goldens.sh` executa o harness sobre
essas entradas e coloca cada saída `<basename>.json` como `refs/elk/<id>.json`.
Exemplo: o id `ptolemy-scrambler` é
`realworld/ptolemy/hierarchical/comm_scrambler_Scrambler.json`.

**Regeneração** (`tools/oracle/regen-goldens.sh`):

1. Exige que o clone de modelos esteja exatamente no commit do manifesto (senão, saída `1`).
2. Exige um oráculo compilado (o `run.sh` precisa de `oracle-build.json`).
3. Prepara todas as refs e `_meta.json` em `test/golden/refs/.elk-staging.*`, depois
   troca o diretório em duas renomeações, de modo que uma execução com falha deixa as refs antigas.
4. `_meta.json` não tem timestamps (`builtAt` fica em `oracle-build.json`), então uma
   regeneração sem entradas alteradas é, no git, uma operação nula byte a byte.

**Quando regenerar:** depois de alterar `ELK_COMMIT`, a série de patches, o conjunto
`golden[]` ou o `commit` do manifesto, ou o harness. Nunca em outros casos.

**Regra de journal.** Toda regeneração que altera uma ref é registrada no journal com a
causa (o id do patch ou a atualização de commit). As refs nunca são editadas à mão. Se uma
asserção TS ou um golden só puder passar sendo alterado, pare e registre no journal (AD-13).

**Census.** `npx tsx tools/corpus/census.ts` não faz layout de nada: ele executa o oráculo em modo parse
sobre todos os modelos e compara o resultado com o `test/corpus/census.json` commitado (898
modelos: id, formatos, origem, algoritmo raiz, contagens de recursos). Saída `0` quando igual, `1` em caso de drift;
`--write` reescreve o arquivo. Ele só roda no clone de modelos fixado e aborta diante de uma
falha do harness.

**Corpus gerado (D7).** `test/corpus/generated/<algorithmSuffix>-<shape>.elkr` contém uma configuração
grandom com seed; o `.json` vizinho é a entrada gerada pelo oráculo, sem layout. Nove configurações cobrem
os ids de algoritmo que nenhum modelo do elk-models usa: `disco`, `force`, `mrtree`, `radial`, `random`,
`sporeCompaction`, `sporeOverlap`, `topdownpacking`, `vertiflex`. Cada uma tem no máximo 50 nós e
nenhum rótulo de aresta (o `BlindTextGenerator` não tem seed). O harness nomeia a raiz gerada como `root`,
porque o `JsonExporter` do ELK resolve uma colisão de id com um sufixo aleatório sem seed. Regenere
somente com `tools/oracle/regen-generated.sh` (diretório de staging e renomeação; uma configuração com falha
deixa os arquivos antigos); uma nova execução sem alterações é uma operação nula no git. O port do grandom em TS deve
reproduzir esses arquivos `.json` byte a byte; os goldens de algoritmos nunca dependem disso.

**Sweep.** `tools/oracle/sweep.sh [--filter <substring>] [--limit <n>] [--shards <n>]
[--out <dir>] [--plan-only]` planeja todos os casos, executa cada um duas vezes em JVMs separadas (os shards
têm como padrão `min(cpus, 8)` processos `run.sh` simultâneos) e grava
`$ELK_ORACLE_DIR/sweep/<elkCommit>-<modelsCommit>/{results.jsonl,summary.json,run-a/}`.
`--plan-only` imprime as contagens de casos por tier e não executa nada; `--filter` mantém os ids de caso que contêm
a substring; `--limit` pega uma amostra com passo uniforme. Saída `0`, a menos que um caso seja `oracle-error`
(`1`); uma falha da ferramenta sai com `2`. As saídas por caso permanecem locais (AD-5). `ELK_SWEEP_TIMEOUT_MS`
(padrão `30000`, lido apenas por `tools/`) limita cada caso; o `run.sh` reinicia uma JVM após um
timeout (código de saída da JVM 75) nos casos sem linha de resultado.

**Relatório de paridade (D9).** `docs/parity-report.md` é gerado a partir do cache do sweep e commitado:
contagens por algoritmo e veredicto, com os commits do ELK e dos modelos e sem timestamps. Regenere
com `npx tsx tools/corpus/parity-report.ts --write`; sem `--write`, o comando sai com `1`
quando o relatório commitado está desatualizado. Nunca o edite à mão.

**Testes do corpus.** `resolveModelsDir()` em `test/corpus/corpus.ts` retorna um motivo de
`skip` quando o clone está ausente ou em outro commit; os testes que precisam dele
são ignorados, com o sha fixado na mensagem. Hoje `test/golden/oracle-refs.test.ts`
verifica apenas as refs commitadas: uma por id do manifesto, geometria em todo nó,
porta, rótulo e aresta, autocomparação, e que `_meta.json` corresponde a
`ELK_COMMIT`, ao manifesto e ao gerador. Ainda não há teste de layout
TS contra o oráculo; ele chega com o primeiro algoritmo portado.

## 4. Patches de seam

Os patches de seam alteram o oráculo; são raros e sempre pareados com um seam em TS.

1. Edite e faça o commit no worktree do oráculo (`$ELK_ORACLE_DIR`), ou escreva o patch em um clone
   de rascunho em `ELK_COMMIT`. Para adicionar um patch pronto ao worktree existente no próprio local (preserva os
   caches `census/` e `sweep/`, que a remoção do worktree apaga), aplique-o com a identidade do
   `build.sh`:
   `git -C "$ELK_ORACLE_DIR" -c user.name=elk-engine-oracle \
-c user.email=oracle@invalid am --3way <patch>`;
   o `build.sh` então verifica a série e recompila no próprio local (cerca de 3 minutos), de modo que os passos 4-5
   podem ser pulados.
2. Exporte:
   `git -C "$ELK_ORACLE_DIR" format-patch -o tools/oracle/patches <ELK_COMMIT>..HEAD`
   (ou apenas os commits novos). Os arquivos se chamam `NNNN-<slug>.patch`; o prefixo
   numérico fixa a ordem de aplicação.
3. Adicione o seam TS correspondente (mesmo comportamento, injetável, em `src/`), com testes
   cujos valores esperados venham do oráculo com o patch (AD-13).
4. Caso contrário, remova o worktree: `git -C "$ELK_SOURCE_DIR" worktree remove $ELK_ORACLE_DIR`
   (adicione `--force` se a saída do build o deixar sujo).
5. Recompile: `tools/oracle/build.sh` (reaplica a série do zero).
6. Regenere: `tools/oracle/regen-goldens.sh`; revise `git diff test/golden/refs`.
7. Registre no journal uma entrada que nomeie o patch (`NNNN-<slug>.patch`) e liste toda
   ref alterada. `patches` em `_meta.json` registra a série automaticamente.

Nunca deixe uma edição não commitada no worktree: o `build.sh` a trata como desatualizada
(saída `2`). Nunca edite o próprio `ELK_SOURCE_DIR`.

## 5. Operações do oráculo (runbook)

| Falha                                                                                    | Detecção                                                                                                                                                                                                                                                                                      | Mitigação                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| O build do Tycho falha (p2 inacessível, JDK, versão do Maven)                            | `tools/oracle/build.sh` sai com valor diferente de zero; a saída completa do Maven fica em `.oracle-build.log` na raiz do repositório. A saída `1` indica ferramenta ausente ou Maven errado; a saída `3` indica que um jar de bundle não foi produzido                                       | O Maven deve ser **3.9.x**: o Tycho 4.0.12 falha no Maven 3.10 (o 3.10.0 do Homebrew) com `ProvisionException: No implementation for MavenTargetLocationFactory was bound`. Um 3.9.11 local fica em `.tools/apache-maven-3.9.11/` (ignorado pelo git): `ELK_MVN=$PWD/.tools/apache-maven-3.9.11/bin/mvn tools/oracle/build.sh`. Use o JDK 21, ou o JDK 17 via `JAVA_HOME`. Verifique a rede (a primeira execução baixa artefatos p2) e execute de novo. `build.sh --record-only` pula o Maven e apenas reescreve `oracle-build.json` a partir de jars já compilados. Saída `2`: remova o worktree (seção 4, passo 4) e recompile. Caso contrário, escale com o final do log |
| O `build.sh` sai com `2` logo após aplicar um patch                                      | Worktree relatado como desatualizado                                                                                                                                                                                                                                                          | O `build.sh` desdobra os assuntos de patch quebrados em várias linhas (o `git format-patch` os quebra acima de cerca de 78 caracteres) e ignora os caches não rastreados `census/` e `sweep/`; qualquer outra sujeira ou um patch não listado ainda resulta em saída `2`: corrija o worktree (seção 4)                                                                                                                                                                                                                                                                                                                                                                      |
| Drift de golden após um patch ou uma atualização de commit                               | `tools/oracle/regen-goldens.sh` seguido de `git diff --exit-code test/golden/refs` não é vazio; `test/golden/oracle-refs.test.ts` falha com um `_meta.json` desatualizado (`elkCommit`, `modelsCommit`); um teste de conformidade TS, quando existir, falha com um relatório de `formatDiffs` | Recompile (`build.sh`), execute `regen-goldens.sh`, revise o diff, registre o id do patch no journal. Nunca edite uma ref à mão nem afrouxe `tol`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Jar do Xtext/ANTLR ausente do cache p2 (`.elkt`, `.elkr` ou qualquer início do `run.sh`) | `run.sh` sai com valor diferente de zero e `bundle <name> not in p2 cache <dir>` (p. ex. `org.eclipse.xtext`, `org.antlr.runtime`, `org.eclipse.xtext.xbase`)                                                                                                                                 | Defina `P2_BUNDLES` como o cache p2 do Tycho que o contém, ou execute o `build.sh` com acesso à rede para que o Tycho o busque; execute o `run.sh` de novo. Não substitua por jars de outro lugar                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Sweep travado ou OOM                                                                     | Um caso vai até o timeout e reporta `timeout` (uma linha no stderr o nomeia); uma execução sem linha de resultado gera `oracle-error` e `sweep: shard <n> run <A or B> exited <code>` no stderr; a máquina usa swap com 8 JVMs simultâneas                                                    | Reduza a concorrência e o tamanho do lote: `sweep.sh --shards 2`, restrinja com `--filter` ou `--limit`. Aumente `ELK_SWEEP_TIMEOUT_MS` apenas para um modelo que é lento, mas correto. Um `timeout` reproduzível é um achado: registre o id do caso no journal, não amplie o limite para escondê-lo                                                                                                                                                                                                                                                                                                                                                                        |
| Drift do census após uma atualização de pin (`ELK_COMMIT` ou `commit` dos modelos)       | `npx tsx tools/corpus/census.ts` sai com `1` e lista os modelos divergentes; `test/corpus/census.test.ts` falha                                                                                                                                                                               | Confirme que o clone e o oráculo estão nos novos pins, execute `census.ts --write` de novo, revise `git diff test/corpus/census.json`, registre a causa no journal, depois execute `sweep.sh` de novo e regenere o relatório de paridade. Nunca edite o census à mão                                                                                                                                                                                                                                                                                                                                                                                                        |
| elk-models ausente ou com sha errado                                                     | Os testes do corpus são ignorados com uma mensagem que nomeia o sha esperado; `regen-goldens.sh` sai com `1` (`elk-models at <sha>, expected pinned <sha>`)                                                                                                                                   | Execute `test/corpus/fetch.sh` (clona e faz checkout do commit fixado). Ele sai com `2` se um clone existente estiver em outro commit e não o toca: corrija esse clone você mesmo ou aponte `ELK_MODELS_DIR` para um caminho novo. Nunca mova o HEAD de um clone existente a partir de um script                                                                                                                                                                                                                                                                                                                                                                            |

Outras falhas do `run.sh`: `oracle-build.json missing` ou `oracle jar missing`
significa executar o `build.sh` primeiro; `bundle <name> not in p2 cache` significa definir
`P2_BUNDLES` como o cache p2 do Tycho ou executar o `build.sh` de novo com acesso à rede.

## 6. Gates

Toda mudança:

| Gate               | Comando                                                          | Critério                                                                                |
| ------------------ | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Tipos              | `npm run typecheck`                                              | saída 0                                                                                 |
| Testes e cobertura | `npm run coverage`                                               | todos os testes passam; 90% de statements, branches, functions e lines em `src/**`      |
| Arquitetura        | `test/architecture/*.fitness.test.ts` (executado por `npm test`) | limites de módulo, globais de módulo, nenhum builtin do Node em `src/`, cabeçalhos SPDX |
| Refs do oráculo    | `test/golden/oracle-refs.test.ts`                                | refs commitadas consistentes com o manifesto e `ELK_COMMIT`                             |

Mudanças em `tools/oracle/`, no manifesto ou na série de patches também exigem:

| Gate                     | Comando                                                                         | Critério                                                                          |
| ------------------------ | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Build do oráculo         | `tools/oracle/build.sh`                                                         | saída 0                                                                           |
| Execução do oráculo      | `tools/oracle/run.sh <outDir> <input.json>...`                                  | saída 0, nenhuma linha `ERROR`                                                    |
| Estabilidade dos goldens | `tools/oracle/regen-goldens.sh`, depois `git diff --exit-code test/golden/refs` | nenhum diff, a menos que a mudança vise mover refs e esteja registrada no journal |
| Shell                    | `shellcheck tools/oracle/*.sh`                                                  | limpo                                                                             |

Mudanças em `tools/oracle/` ou `tools/corpus/` também exigem:

| Gate                   | Comando                                                                                | Critério                                                         |
| ---------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Census                 | `npx tsx tools/corpus/census.ts`                                                       | saída 0 (sem drift)                                              |
| Estabilidade do gerado | `tools/oracle/regen-generated.sh`, depois `git diff --exit-code test/corpus/generated` | nenhum diff                                                      |
| Sweep                  | `tools/oracle/sweep.sh` (ou `--filter`/`--limit` para uma amostra)                     | saída 0: nenhum `oracle-error`                                   |
| Relatório de paridade  | `npx tsx tools/corpus/parity-report.ts`                                                | saída 0 (relatório commitado atualizado); regenere com `--write` |
