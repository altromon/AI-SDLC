/**
 * AI-SDLC: TypeScript/JavaScript Real AST Static Analysis Engine
 * Powered by ts-morph (MIT License)
 */

import * as path from 'path';
import { Node, Project, SyntaxKind } from 'ts-morph';
import { FunctionMetrics } from '../../types/index.js';

const CYCLOMATIC_KINDS = new Set<SyntaxKind>([
  SyntaxKind.IfStatement,
  SyntaxKind.ConditionalExpression,
  SyntaxKind.ForStatement,
  SyntaxKind.ForInStatement,
  SyntaxKind.ForOfStatement,
  SyntaxKind.WhileStatement,
  SyntaxKind.DoStatement,
  SyntaxKind.CaseClause,
  SyntaxKind.CatchClause,
]);

const LOGICAL_BINARY_OPS = new Set<SyntaxKind>([
  SyntaxKind.AmpersandAmpersandToken,
  SyntaxKind.BarBarToken,
  SyntaxKind.QuestionQuestionToken,
]);

let sharedProject: Project | null = null;

function getSharedProject(): Project {
  if (!sharedProject) {
    sharedProject = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: { allowJs: true, jsx: 1 },
    });
  }
  return sharedProject;
}

function resolveDeclarationName(node: Node): string | null {
  if (
    Node.isFunctionDeclaration(node) ||
    Node.isMethodDeclaration(node) ||
    Node.isGetAccessorDeclaration(node) ||
    Node.isSetAccessorDeclaration(node)
  ) {
    const prefix = Node.isGetAccessorDeclaration(node) ? 'get ' : Node.isSetAccessorDeclaration(node) ? 'set ' : '';
    return `${prefix}${node.getName() || 'anonymous'}`;
  }
  if (Node.isConstructorDeclaration(node)) return 'constructor';
  return null;
}

function resolveExpressionParentName(parent: Node): string {
  if (Node.isVariableDeclaration(parent) || Node.isPropertyAssignment(parent)) {
    return parent.getName();
  }
  if (Node.isCallExpression(parent)) {
    const args = parent.getArguments();
    if (args.length > 0 && Node.isStringLiteral(args[0])) {
      return args[0].getLiteralText();
    }
    return parent.getExpression().getText();
  }
  return 'anonymous';
}

function resolveFunctionName(node: Node): string {
  const declName = resolveDeclarationName(node);
  if (declName) return declName;

  const parent = node.getParent();
  return parent ? resolveExpressionParentName(parent) : 'anonymous';
}

function isBranchNode(kind: SyntaxKind, child: Node): boolean {
  if (CYCLOMATIC_KINDS.has(kind)) return true;
  if (kind === SyntaxKind.BinaryExpression) {
    const binExpr = child.asKind(SyntaxKind.BinaryExpression);
    return LOGICAL_BINARY_OPS.has(binExpr?.getOperatorToken().getKind() ?? SyntaxKind.Unknown);
  }
  return false;
}

function computeCyclomaticFromAst(node: Node): number {
  let complexity = 1;
  node.forEachDescendant((child) => {
    if (isNestedFunctionBoundary(child, node)) return;
    if (isBranchNode(child.getKind(), child)) {
      complexity++;
    }
  });
  return complexity;
}

function isNestedFunctionBoundary(child: Node, root: Node): boolean {
  if (child === root) return false;
  return (
    Node.isFunctionDeclaration(child) ||
    Node.isMethodDeclaration(child) ||
    Node.isConstructorDeclaration(child)
  );
}

function computeCognitiveFromAst(node: Node, currentNesting = 0): number {
  let cognitive = 0;
  for (const child of node.getChildren()) {
    const kind = child.getKind();
    const isControlFlow = CYCLOMATIC_KINDS.has(kind);
    const nextNesting = isControlFlow ? currentNesting + 1 : currentNesting;

    if (isControlFlow) {
      cognitive += kind === SyntaxKind.CaseClause ? 1 : 1 + currentNesting;
    }

    if (!isNestedFunctionBoundary(child, node)) {
      cognitive += computeCognitiveFromAst(child, nextNesting);
    }
  }
  return cognitive;
}

function calculateLocAndHalstead(fullText: string, cyclomatic: number): { loc: number; mi: number } {
  const allLines = fullText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const commentLines = allLines.filter((l) => l.startsWith('//') || l.startsWith('/*') || l.startsWith('*')).length;
  const loc = Math.max(1, allLines.length - commentLines);

  const cleanText = fullText.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
  const tokens = cleanText.split(/[\s,;().{}[\]=+\-*/<>!&|:]+/).filter((t) => t.length > 0);
  const N = tokens.length || 1;
  const n = new Set(tokens).size || 1;
  const V = Math.max(1, N * Math.log2(Math.max(2, n)));

  const perCM = allLines.length > 0 ? commentLines / allLines.length : 0;
  const commentWeight = 50 * Math.sin(Math.sqrt(2.4 * perCM));

  const rawMI = 171 - 5.2 * Math.log(V) - 0.23 * cyclomatic - 16.2 * Math.log(loc) + commentWeight;
  const normalizedMI = Math.max(0, Math.min(100, (rawMI * 100) / 171));

  return { loc, mi: Math.round(normalizedMI * 10) / 10 };
}

function detectAstCodeSmells(node: Node, loc: number, nodeText: string): string[] {
  const smells: string[] = [];
  if (node.getDescendantsOfKind(SyntaxKind.AnyKeyword).length > 0) {
    smells.push('Uso prohibido de "any"');
  }
  if (/\/\/\s*@ts-ignore|\/\/\s*eslint-disable/.test(nodeText)) {
    smells.push('Supresión no autorizada de linter');
  }
  if (loc > 40) {
    smells.push(`Función extensa (${loc} líneas > límite 40)`);
  }
  return smells;
}

function isDeclarationFunction(node: Node): boolean {
  return (
    Node.isFunctionDeclaration(node) ||
    Node.isMethodDeclaration(node) ||
    Node.isConstructorDeclaration(node) ||
    Node.isGetAccessorDeclaration(node) ||
    Node.isSetAccessorDeclaration(node)
  );
}

function isAnalyzableArrowOrExpr(node: Node): boolean {
  if (!Node.isArrowFunction(node) && !Node.isFunctionExpression(node)) return false;
  const parent = node.getParent();
  if (!parent) return false;
  if (Node.isVariableDeclaration(parent) || Node.isPropertyAssignment(parent)) return true;
  if (Node.isCallExpression(parent)) {
    return ['it', 'test'].includes(parent.getExpression().getText());
  }
  return false;
}

function isAnalyzableFunction(node: Node): boolean {
  return isDeclarationFunction(node) || isAnalyzableArrowOrExpr(node);
}

function buildNodeMetrics(node: Node, filePath: string): FunctionMetrics {
  const functionName = resolveFunctionName(node);
  const cyclomatic = computeCyclomaticFromAst(node);
  const cognitive = computeCognitiveFromAst(node);
  const fullText = node.getFullText();
  const nodeText = node.getText();
  const { loc, mi } = calculateLocAndHalstead(fullText, cyclomatic);
  const codeSmells = detectAstCodeSmells(node, loc, nodeText);

  return { functionName, filePath, loc, cyclomatic, cognitive, maintainability: mi, codeSmells };
}

function buildModuleFallback(content: string, filePath: string): FunctionMetrics {
  const { loc, mi } = calculateLocAndHalstead(content, 1);
  const codeSmells = loc > 40 ? [`Función extensa (${loc} líneas > límite 40)`] : [];
  return {
    functionName: 'main_module',
    filePath,
    loc,
    cyclomatic: 1,
    cognitive: 0,
    maintainability: mi,
    codeSmells,
  };
}

export function extractFunctionsTypeScriptAst(content: string, filePath: string): FunctionMetrics[] {
  const project = getSharedProject();
  const ext = path.extname(filePath).toLowerCase() || '.ts';
  const fileName = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${ext}`;
  const sourceFile = project.createSourceFile(fileName, content, { overwrite: true });
  const metricsList: FunctionMetrics[] = [];

  try {
    sourceFile.forEachDescendant((node) => {
      if (isAnalyzableFunction(node)) {
        metricsList.push(buildNodeMetrics(node, filePath));
      }
    });
    return metricsList.length > 0 ? metricsList : [buildModuleFallback(content, filePath)];
  } finally {
    sourceFile.forget();
  }
}
