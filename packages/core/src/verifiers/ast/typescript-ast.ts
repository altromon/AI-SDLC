/**
 * AI-SDLC: TypeScript/JavaScript Real AST Static Analysis Engine
 * Powered by ts-morph (MIT License)
 */

import * as path from 'path';
import { Node, Project, SyntaxKind } from 'ts-morph';
import { FunctionMetrics } from '../../types/index.js';

let sharedProject: Project | null = null;

function getSharedProject(): Project {
  if (!sharedProject) {
    sharedProject = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: {
        allowJs: true,
        jsx: 1, // Preserve / TSX
      },
    });
  }
  return sharedProject;
}

function resolveFunctionName(node: Node): string {
  if (
    Node.isFunctionDeclaration(node) ||
    Node.isMethodDeclaration(node) ||
    Node.isGetAccessorDeclaration(node) ||
    Node.isSetAccessorDeclaration(node)
  ) {
    const prefix = Node.isGetAccessorDeclaration(node) ? 'get ' : Node.isSetAccessorDeclaration(node) ? 'set ' : '';
    return `${prefix}${node.getName() || 'anonymous'}`;
  }

  if (Node.isConstructorDeclaration(node)) {
    return 'constructor';
  }

  const parent = node.getParent();
  if (parent && Node.isVariableDeclaration(parent)) {
    return parent.getName();
  }
  if (parent && Node.isPropertyAssignment(parent)) {
    return parent.getName();
  }
  if (parent && Node.isCallExpression(parent)) {
    const args = parent.getArguments();
    if (args.length > 0 && Node.isStringLiteral(args[0])) {
      return args[0].getLiteralText();
    }
    return parent.getExpression().getText();
  }

  return 'anonymous';
}

function computeCyclomaticFromAst(node: Node): number {
  let complexity = 1;
  node.forEachDescendant((child) => {
    if (isNestedFunctionBoundary(child, node)) return;

    const kind = child.getKind();
    if (
      kind === SyntaxKind.IfStatement ||
      kind === SyntaxKind.ConditionalExpression ||
      kind === SyntaxKind.ForStatement ||
      kind === SyntaxKind.ForInStatement ||
      kind === SyntaxKind.ForOfStatement ||
      kind === SyntaxKind.WhileStatement ||
      kind === SyntaxKind.DoStatement ||
      kind === SyntaxKind.CaseClause ||
      kind === SyntaxKind.CatchClause
    ) {
      complexity++;
    } else if (kind === SyntaxKind.BinaryExpression) {
      const op = child.asKind(SyntaxKind.BinaryExpression)?.getOperatorToken().getKind();
      if (
        op === SyntaxKind.AmpersandAmpersandToken ||
        op === SyntaxKind.BarBarToken ||
        op === SyntaxKind.QuestionQuestionToken
      ) {
        complexity++;
      }
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
    let nextNesting = currentNesting;

    if (
      kind === SyntaxKind.IfStatement ||
      kind === SyntaxKind.ConditionalExpression ||
      kind === SyntaxKind.ForStatement ||
      kind === SyntaxKind.ForInStatement ||
      kind === SyntaxKind.ForOfStatement ||
      kind === SyntaxKind.WhileStatement ||
      kind === SyntaxKind.DoStatement ||
      kind === SyntaxKind.CatchClause
    ) {
      cognitive += 1 + currentNesting;
      nextNesting = currentNesting + 1;
    } else if (kind === SyntaxKind.CaseClause) {
      cognitive += 1;
    }

    if (!isNestedFunctionBoundary(child, node)) {
      cognitive += computeCognitiveFromAst(child, nextNesting);
    }
  }

  return cognitive;
}

function calculateLocAndHalstead(nodeText: string, cyclomatic: number): { loc: number; mi: number } {
  const lines = nodeText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('//') && !l.startsWith('/*') && !l.startsWith('*'));
  const loc = Math.max(1, lines.length);

  const tokens = nodeText.split(/[\s,;().{}[\]=+\-*/<>!&|:]+/).filter((t) => t.length > 0);
  const N = tokens.length || 1;
  const n = new Set(tokens).size || 1;
  const V = Math.max(1, N * Math.log2(Math.max(2, n)));

  const rawMI = 171 - 5.2 * Math.log(V) - 0.23 * cyclomatic - 16.2 * Math.log(loc);
  const normalizedMI = Math.max(0, Math.min(100, (rawMI * 100) / 171));

  return { loc, mi: Math.round(normalizedMI * 10) / 10 };
}

function detectAstCodeSmells(node: Node, loc: number, nodeText: string): string[] {
  const smells: string[] = [];
  const anyCount = node.getDescendantsOfKind(SyntaxKind.AnyKeyword).length;
  if (anyCount > 0) {
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

function isAnalyzableFunction(node: Node): boolean {
  if (
    Node.isFunctionDeclaration(node) ||
    Node.isMethodDeclaration(node) ||
    Node.isConstructorDeclaration(node) ||
    Node.isGetAccessorDeclaration(node) ||
    Node.isSetAccessorDeclaration(node)
  ) {
    return true;
  }

  if (Node.isArrowFunction(node) || Node.isFunctionExpression(node)) {
    const parent = node.getParent();
    if (!parent) return false;
    if (Node.isVariableDeclaration(parent) || Node.isPropertyAssignment(parent)) {
      return true;
    }
    if (Node.isCallExpression(parent)) {
      const callName = parent.getExpression().getText();
      return ['it', 'test', 'describe'].includes(callName);
    }
  }
  return false;
}

export function extractFunctionsTypeScriptAst(content: string, filePath: string): FunctionMetrics[] {
  const project = getSharedProject();
  const ext = path.extname(filePath).toLowerCase() || '.ts';
  const fileName = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${ext}`;
  const sourceFile = project.createSourceFile(fileName, content, { overwrite: true });

  const metricsList: FunctionMetrics[] = [];

  try {
    sourceFile.forEachDescendant((node) => {
      if (!isAnalyzableFunction(node)) return;

      const functionName = resolveFunctionName(node);
      const cyclomatic = computeCyclomaticFromAst(node);
      const cognitive = computeCognitiveFromAst(node);
      const nodeText = node.getText();
      const { loc, mi } = calculateLocAndHalstead(nodeText, cyclomatic);
      const codeSmells = detectAstCodeSmells(node, loc, nodeText);

      metricsList.push({
        functionName,
        filePath,
        loc,
        cyclomatic,
        cognitive,
        maintainability: mi,
        codeSmells,
      });
    });

    if (metricsList.length === 0) {
      const { loc, mi } = calculateLocAndHalstead(content, 1);
      metricsList.push({
        functionName: 'main_module',
        filePath,
        loc,
        cyclomatic: 1,
        cognitive: 0,
        maintainability: mi,
        codeSmells: loc > 40 ? [`Función extensa (${loc} líneas > límite 40)`] : [],
      });
    }
  } finally {
    sourceFile.forget();
  }

  return metricsList;
}
