// SPDX-License-Identifier: EPL-2.0
// Proof of EdgeRouterFactory (mission 7e, T10): `create()` returns the router the Java `switch` names for each
// `EdgeRouting` constant (`UNDEFINED` takes the `default` arm, the orthogonal router), and `factoryFor` caches one
// factory per constant (EdgeRouterFactory.java:36,51-57).
import { describe, expect, it } from 'vitest';
import { EdgeRouting } from '../../../core/options/EdgeRouting.js';
import { EdgeRouterFactory } from './EdgeRouterFactory.js';
import { OrthogonalEdgeRouter } from './OrthogonalEdgeRouter.js';
import { PolylineEdgeRouter } from './PolylineEdgeRouter.js';
import { SplineEdgeRouter } from './splines/SplineEdgeRouter.js';

type RouterClass = abstract new () => object;

/** The Java `switch` of `EdgeRouterFactory.create` (`:63-73`): `POLYLINE`, `SPLINES`, `default`. */
const ROUTER_OF: readonly (readonly [EdgeRouting, RouterClass])[] = [
  [EdgeRouting.POLYLINE, PolylineEdgeRouter],
  [EdgeRouting.SPLINES, SplineEdgeRouter],
  [EdgeRouting.ORTHOGONAL, OrthogonalEdgeRouter],
  [EdgeRouting.UNDEFINED, OrthogonalEdgeRouter],
];

describe('EdgeRouterFactory', () => {
  it('covers every EdgeRouting constant', () => {
    expect(new Set(ROUTER_OF.map(([routing]) => routing))).toEqual(new Set(EdgeRouting.values()));
  });

  it.each(ROUTER_OF.map(([routing, router]) => [routing.name(), routing, router] as const))(
    'creates the router of %s',
    (_name, routing, router) => {
      const created = EdgeRouterFactory.factoryFor(routing).create();
      expect(created.constructor).toBe(router);
    },
  );

  it('creates a fresh router per call', () => {
    const factory = EdgeRouterFactory.factoryFor(EdgeRouting.POLYLINE);
    expect(factory.create()).not.toBe(factory.create());
  });

  it.each(EdgeRouting.values().map((routing) => [routing.name(), routing] as const))(
    'caches the factory of %s',
    (_name, routing) => {
      expect(EdgeRouterFactory.factoryFor(routing)).toBe(EdgeRouterFactory.factoryFor(routing));
    },
  );

  it('keeps one factory per constant', () => {
    const factories = new Set(EdgeRouting.values().map((routing) => EdgeRouterFactory.factoryFor(routing)));
    expect(factories.size).toBe(EdgeRouting.values().length);
  });
});
