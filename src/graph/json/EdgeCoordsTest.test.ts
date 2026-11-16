// SPDX-License-Identifier: EPL-2.0
// Port of org.eclipse.elk.graph.json.test.EdgeCoordsTest (one method, `edgeCoordsTest`); assertions frozen (AD-13).
// The Java registers layered through `PlainJavaInitialization.initializePlainJavaLayout`; the port registers layered's
// metadata (`registerLayered`) once the core service is reset, as `LayoutOptionsTest` needs it too. Mission 7h, T11.
// @see test/org.eclipse.elk.graph.json.test/src/org/eclipse/elk/graph/json/test/EdgeCoordsTest.xtend
import { beforeEach, describe, expect, it } from 'vitest';
import { registerLayered } from '../../../test/helpers/layered-framework-replay.js';
import { LayoutMetaDataService } from '../../core/data/LayoutMetaDataService.js';
import { RecursiveGraphLayoutEngine } from '../../core/RecursiveGraphLayoutEngine.js';
import { BasicProgressMonitor } from '../../core/util/BasicProgressMonitor.js';
import { Maybe } from '../../core/util/Maybe.js';
import type { JsonObject } from '../../gson/JsonObject.js';
import { JsonParser } from '../../gson/JsonParser.js';
import { ElkGraphJson } from './ElkGraphJson.js';
import type { JsonImporter } from './JsonImporter.js';

beforeEach(() => {
  LayoutMetaDataService.unload();
  LayoutMetaDataService.getInstance();
  registerLayered();
});

const graph = `
{
    "id": "root",
    "properties": {
        "algorithm": "layered",
        "org.eclipse.elk.hierarchyHandling": "INCLUDE_CHILDREN"
    },
    "children": [
        { "id": "A",
            "children": [
                { "id": "x", "width": 50, "height": 90 },
                { "id": "B",
                    "labels": [ { "text": "B", "width": 10, "height": 12 } ],
                    "ports": [
                        { "id": "p", "width": 10, "height": 10,
                            "labels": [ { "text": "p", "width": 10, "height": 12 } ]
                        }
                    ],
                    "children": [
                        { "id": "y", "width": 50, "height": 90 },
                        { "id": "z", "width": 50, "height": 90 }
                    ],
                    "edges": [
                        { "id": "e1", "sources": [ "y" ], "targets": [ "z" ] },
                        { "id": "e2", "sources": [ "x" ], "targets": [ "z" ],
                            "labels": [ { "text": "e2", "width": 20, "height": 12 } ]
                        },
                        { "id": "e3", "sources": [ "x" ], "targets": [ "p" ] },
                        { "id": "e4", "sources": [ "p" ], "targets": [ "y" ] }
                    ]
                }
            ]
        }
    ]
}
`;

const outputPC = `
{
 "id": "root",
 "properties": {
  "algorithm": "layered",
  "org.eclipse.elk.hierarchyHandling": "INCLUDE_CHILDREN",
  "org.eclipse.elk.json.shapeCoords": "PARENT",
  "org.eclipse.elk.json.edgeCoords": "CONTAINER"
 },
 "children": [
  {
   "id": "A",
   "children": [
    {
     "id": "x",
     "width": 50,
     "height": 90,
     "x": 12,
     "y": 39
    },
    {
     "id": "B",
     "labels": [
      {
       "text": "B",
       "width": 10,
       "height": 12,
       "x": 0,
       "y": 0
      }
     ],
     "ports": [
      {
       "id": "p",
       "width": 10,
       "height": 10,
       "labels": [
        {
         "text": "p",
         "width": 10,
         "height": 12,
         "x": -11,
         "y": -13
        }
       ],
       "x": -10,
       "y": 52
      }
     ],
     "children": [
      {
       "id": "y",
       "width": 50,
       "height": 90,
       "x": 12,
       "y": 12
      },
      {
       "id": "z",
       "width": 50,
       "height": 90,
       "x": 82,
       "y": 27
      }
     ],
     "edges": [
      {
       "id": "e1",
       "sources": [
        "y"
       ],
       "targets": [
        "z"
       ],
       "sections": [
        {
         "id": "e1_s0",
         "startPoint": {
          "x": 62,
          "y": 57
         },
         "endPoint": {
          "x": 82,
          "y": 57
         },
         "incomingShape": "y",
         "outgoingShape": "z"
        }
       ],
       "container": "B"
      },
      {
       "id": "e2",
       "sources": [
        "x"
       ],
       "targets": [
        "z"
       ],
       "labels": [
        {
         "text": "e2",
         "width": 20,
         "height": 12,
         "x": 82,
         "y": 102
        }
       ],
       "sections": [
        {
         "id": "e2_s0",
         "startPoint": {
          "x": 62,
          "y": 99
         },
         "endPoint": {
          "x": 225,
          "y": 99
         },
         "bendPoints": [
          {
           "x": 112,
           "y": 99
          },
          {
           "x": 112,
           "y": 124
          },
          {
           "x": 215,
           "y": 124
          },
          {
           "x": 215,
           "y": 99
          }
         ],
         "incomingShape": "x",
         "outgoingShape": "z"
        }
       ],
       "container": "A"
      },
      {
       "id": "e3",
       "sources": [
        "x"
       ],
       "targets": [
        "p"
       ],
       "sections": [
        {
         "id": "e3_s0",
         "startPoint": {
          "x": 62,
          "y": 69
         },
         "endPoint": {
          "x": 133,
          "y": 69
         },
         "incomingShape": "x",
         "outgoingShape": "p"
        }
       ],
       "container": "A"
      },
      {
       "id": "e4",
       "sources": [
        "p"
       ],
       "targets": [
        "y"
       ],
       "sections": [
        {
         "id": "e4_s0",
         "startPoint": {
          "x": -10,
          "y": 57
         },
         "endPoint": {
          "x": 12,
          "y": 57
         },
         "incomingShape": "p",
         "outgoingShape": "y"
        }
       ],
       "container": "B"
      }
     ],
     "x": 143,
     "y": 12,
     "width": 144,
     "height": 129
    }
   ],
   "x": 12,
   "y": 12,
   "width": 299,
   "height": 153
  }
 ],
 "x": 0,
 "y": 0,
 "width": 323,
 "height": 177
}
`;

const outputPP = `
{
 "id": "root",
 "properties": {
  "algorithm": "layered",
  "org.eclipse.elk.hierarchyHandling": "INCLUDE_CHILDREN",
  "org.eclipse.elk.json.shapeCoords": "PARENT",
  "org.eclipse.elk.json.edgeCoords": "PARENT"
 },
 "children": [
  {
   "id": "A",
   "children": [
    {
     "id": "x",
     "width": 50,
     "height": 90,
     "x": 12,
     "y": 39
    },
    {
     "id": "B",
     "labels": [
      {
       "text": "B",
       "width": 10,
       "height": 12,
       "x": 0,
       "y": 0
      }
     ],
     "ports": [
      {
       "id": "p",
       "width": 10,
       "height": 10,
       "labels": [
        {
         "text": "p",
         "width": 10,
         "height": 12,
         "x": -11,
         "y": -13
        }
       ],
       "x": -10,
       "y": 52
      }
     ],
     "children": [
      {
       "id": "y",
       "width": 50,
       "height": 90,
       "x": 12,
       "y": 12
      },
      {
       "id": "z",
       "width": 50,
       "height": 90,
       "x": 82,
       "y": 27
      }
     ],
     "edges": [
      {
       "id": "e1",
       "sources": [
        "y"
       ],
       "targets": [
        "z"
       ],
       "sections": [
        {
         "id": "e1_s0",
         "startPoint": {
          "x": 62,
          "y": 57
         },
         "endPoint": {
          "x": 82,
          "y": 57
         },
         "incomingShape": "y",
         "outgoingShape": "z"
        }
       ]
      },
      {
       "id": "e2",
       "sources": [
        "x"
       ],
       "targets": [
        "z"
       ],
       "labels": [
        {
         "text": "e2",
         "width": 20,
         "height": 12,
         "x": -61,
         "y": 90
        }
       ],
       "sections": [
        {
         "id": "e2_s0",
         "startPoint": {
          "x": -81,
          "y": 87
         },
         "endPoint": {
          "x": 82,
          "y": 87
         },
         "bendPoints": [
          {
           "x": -31,
           "y": 87
          },
          {
           "x": -31,
           "y": 112
          },
          {
           "x": 72,
           "y": 112
          },
          {
           "x": 72,
           "y": 87
          }
         ],
         "incomingShape": "x",
         "outgoingShape": "z"
        }
       ]
      },
      {
       "id": "e3",
       "sources": [
        "x"
       ],
       "targets": [
        "p"
       ],
       "sections": [
        {
         "id": "e3_s0",
         "startPoint": {
          "x": -81,
          "y": 57
         },
         "endPoint": {
          "x": -10,
          "y": 57
         },
         "incomingShape": "x",
         "outgoingShape": "p"
        }
       ]
      },
      {
       "id": "e4",
       "sources": [
        "p"
       ],
       "targets": [
        "y"
       ],
       "sections": [
        {
         "id": "e4_s0",
         "startPoint": {
          "x": -10,
          "y": 57
         },
         "endPoint": {
          "x": 12,
          "y": 57
         },
         "incomingShape": "p",
         "outgoingShape": "y"
        }
       ]
      }
     ],
     "x": 143,
     "y": 12,
     "width": 144,
     "height": 129
    }
   ],
   "x": 12,
   "y": 12,
   "width": 299,
   "height": 153
  }
 ],
 "x": 0,
 "y": 0,
 "width": 323,
 "height": 177
}
`;

const outputPR = `
{
 "id": "root",
 "properties": {
  "algorithm": "layered",
  "org.eclipse.elk.hierarchyHandling": "INCLUDE_CHILDREN",
  "org.eclipse.elk.json.shapeCoords": "PARENT",
  "org.eclipse.elk.json.edgeCoords": "ROOT"
 },
 "children": [
  {
   "id": "A",
   "children": [
    {
     "id": "x",
     "width": 50,
     "height": 90,
     "x": 12,
     "y": 39
    },
    {
     "id": "B",
     "labels": [
      {
       "text": "B",
       "width": 10,
       "height": 12,
       "x": 0,
       "y": 0
      }
     ],
     "ports": [
      {
       "id": "p",
       "width": 10,
       "height": 10,
       "labels": [
        {
         "text": "p",
         "width": 10,
         "height": 12,
         "x": -11,
         "y": -13
        }
       ],
       "x": -10,
       "y": 52
      }
     ],
     "children": [
      {
       "id": "y",
       "width": 50,
       "height": 90,
       "x": 12,
       "y": 12
      },
      {
       "id": "z",
       "width": 50,
       "height": 90,
       "x": 82,
       "y": 27
      }
     ],
     "edges": [
      {
       "id": "e1",
       "sources": [
        "y"
       ],
       "targets": [
        "z"
       ],
       "sections": [
        {
         "id": "e1_s0",
         "startPoint": {
          "x": 217,
          "y": 81
         },
         "endPoint": {
          "x": 237,
          "y": 81
         },
         "incomingShape": "y",
         "outgoingShape": "z"
        }
       ]
      },
      {
       "id": "e2",
       "sources": [
        "x"
       ],
       "targets": [
        "z"
       ],
       "labels": [
        {
         "text": "e2",
         "width": 20,
         "height": 12,
         "x": 94,
         "y": 114
        }
       ],
       "sections": [
        {
         "id": "e2_s0",
         "startPoint": {
          "x": 74,
          "y": 111
         },
         "endPoint": {
          "x": 237,
          "y": 111
         },
         "bendPoints": [
          {
           "x": 124,
           "y": 111
          },
          {
           "x": 124,
           "y": 136
          },
          {
           "x": 227,
           "y": 136
          },
          {
           "x": 227,
           "y": 111
          }
         ],
         "incomingShape": "x",
         "outgoingShape": "z"
        }
       ]
      },
      {
       "id": "e3",
       "sources": [
        "x"
       ],
       "targets": [
        "p"
       ],
       "sections": [
        {
         "id": "e3_s0",
         "startPoint": {
          "x": 74,
          "y": 81
         },
         "endPoint": {
          "x": 145,
          "y": 81
         },
         "incomingShape": "x",
         "outgoingShape": "p"
        }
       ]
      },
      {
       "id": "e4",
       "sources": [
        "p"
       ],
       "targets": [
        "y"
       ],
       "sections": [
        {
         "id": "e4_s0",
         "startPoint": {
          "x": 145,
          "y": 81
         },
         "endPoint": {
          "x": 167,
          "y": 81
         },
         "incomingShape": "p",
         "outgoingShape": "y"
        }
       ]
      }
     ],
     "x": 143,
     "y": 12,
     "width": 144,
     "height": 129
    }
   ],
   "x": 12,
   "y": 12,
   "width": 299,
   "height": 153
  }
 ],
 "x": 0,
 "y": 0,
 "width": 323,
 "height": 177
}
`;

const outputRC = `
{
 "id": "root",
 "properties": {
  "algorithm": "layered",
  "org.eclipse.elk.hierarchyHandling": "INCLUDE_CHILDREN",
  "org.eclipse.elk.json.shapeCoords": "ROOT",
  "org.eclipse.elk.json.edgeCoords": "CONTAINER"
 },
 "children": [
  {
   "id": "A",
   "children": [
    {
     "id": "x",
     "width": 50,
     "height": 90,
     "x": 24,
     "y": 51
    },
    {
     "id": "B",
     "labels": [
      {
       "text": "B",
       "width": 10,
       "height": 12,
       "x": 155,
       "y": 24
      }
     ],
     "ports": [
      {
       "id": "p",
       "width": 10,
       "height": 10,
       "labels": [
        {
         "text": "p",
         "width": 10,
         "height": 12,
         "x": 134,
         "y": 63
        }
       ],
       "x": 145,
       "y": 76
      }
     ],
     "children": [
      {
       "id": "y",
       "width": 50,
       "height": 90,
       "x": 167,
       "y": 36
      },
      {
       "id": "z",
       "width": 50,
       "height": 90,
       "x": 237,
       "y": 51
      }
     ],
     "edges": [
      {
       "id": "e1",
       "sources": [
        "y"
       ],
       "targets": [
        "z"
       ],
       "sections": [
        {
         "id": "e1_s0",
         "startPoint": {
          "x": 62,
          "y": 57
         },
         "endPoint": {
          "x": 82,
          "y": 57
         },
         "incomingShape": "y",
         "outgoingShape": "z"
        }
       ],
       "container": "B"
      },
      {
       "id": "e2",
       "sources": [
        "x"
       ],
       "targets": [
        "z"
       ],
       "labels": [
        {
         "text": "e2",
         "width": 20,
         "height": 12,
         "x": 82,
         "y": 102
        }
       ],
       "sections": [
        {
         "id": "e2_s0",
         "startPoint": {
          "x": 62,
          "y": 99
         },
         "endPoint": {
          "x": 225,
          "y": 99
         },
         "bendPoints": [
          {
           "x": 112,
           "y": 99
          },
          {
           "x": 112,
           "y": 124
          },
          {
           "x": 215,
           "y": 124
          },
          {
           "x": 215,
           "y": 99
          }
         ],
         "incomingShape": "x",
         "outgoingShape": "z"
        }
       ],
       "container": "A"
      },
      {
       "id": "e3",
       "sources": [
        "x"
       ],
       "targets": [
        "p"
       ],
       "sections": [
        {
         "id": "e3_s0",
         "startPoint": {
          "x": 62,
          "y": 69
         },
         "endPoint": {
          "x": 133,
          "y": 69
         },
         "incomingShape": "x",
         "outgoingShape": "p"
        }
       ],
       "container": "A"
      },
      {
       "id": "e4",
       "sources": [
        "p"
       ],
       "targets": [
        "y"
       ],
       "sections": [
        {
         "id": "e4_s0",
         "startPoint": {
          "x": -10,
          "y": 57
         },
         "endPoint": {
          "x": 12,
          "y": 57
         },
         "incomingShape": "p",
         "outgoingShape": "y"
        }
       ],
       "container": "B"
      }
     ],
     "x": 155,
     "y": 24,
     "width": 144,
     "height": 129
    }
   ],
   "x": 12,
   "y": 12,
   "width": 299,
   "height": 153
  }
 ],
 "x": 0,
 "y": 0,
 "width": 323,
 "height": 177
}
`;

const outputRP = `
{
 "id": "root",
 "properties": {
  "algorithm": "layered",
  "org.eclipse.elk.hierarchyHandling": "INCLUDE_CHILDREN",
  "org.eclipse.elk.json.shapeCoords": "ROOT",
  "org.eclipse.elk.json.edgeCoords": "PARENT"
 },
 "children": [
  {
   "id": "A",
   "children": [
    {
     "id": "x",
     "width": 50,
     "height": 90,
     "x": 24,
     "y": 51
    },
    {
     "id": "B",
     "labels": [
      {
       "text": "B",
       "width": 10,
       "height": 12,
       "x": 155,
       "y": 24
      }
     ],
     "ports": [
      {
       "id": "p",
       "width": 10,
       "height": 10,
       "labels": [
        {
         "text": "p",
         "width": 10,
         "height": 12,
         "x": 134,
         "y": 63
        }
       ],
       "x": 145,
       "y": 76
      }
     ],
     "children": [
      {
       "id": "y",
       "width": 50,
       "height": 90,
       "x": 167,
       "y": 36
      },
      {
       "id": "z",
       "width": 50,
       "height": 90,
       "x": 237,
       "y": 51
      }
     ],
     "edges": [
      {
       "id": "e1",
       "sources": [
        "y"
       ],
       "targets": [
        "z"
       ],
       "sections": [
        {
         "id": "e1_s0",
         "startPoint": {
          "x": 62,
          "y": 57
         },
         "endPoint": {
          "x": 82,
          "y": 57
         },
         "incomingShape": "y",
         "outgoingShape": "z"
        }
       ]
      },
      {
       "id": "e2",
       "sources": [
        "x"
       ],
       "targets": [
        "z"
       ],
       "labels": [
        {
         "text": "e2",
         "width": 20,
         "height": 12,
         "x": -61,
         "y": 90
        }
       ],
       "sections": [
        {
         "id": "e2_s0",
         "startPoint": {
          "x": -81,
          "y": 87
         },
         "endPoint": {
          "x": 82,
          "y": 87
         },
         "bendPoints": [
          {
           "x": -31,
           "y": 87
          },
          {
           "x": -31,
           "y": 112
          },
          {
           "x": 72,
           "y": 112
          },
          {
           "x": 72,
           "y": 87
          }
         ],
         "incomingShape": "x",
         "outgoingShape": "z"
        }
       ]
      },
      {
       "id": "e3",
       "sources": [
        "x"
       ],
       "targets": [
        "p"
       ],
       "sections": [
        {
         "id": "e3_s0",
         "startPoint": {
          "x": -81,
          "y": 57
         },
         "endPoint": {
          "x": -10,
          "y": 57
         },
         "incomingShape": "x",
         "outgoingShape": "p"
        }
       ]
      },
      {
       "id": "e4",
       "sources": [
        "p"
       ],
       "targets": [
        "y"
       ],
       "sections": [
        {
         "id": "e4_s0",
         "startPoint": {
          "x": -10,
          "y": 57
         },
         "endPoint": {
          "x": 12,
          "y": 57
         },
         "incomingShape": "p",
         "outgoingShape": "y"
        }
       ]
      }
     ],
     "x": 155,
     "y": 24,
     "width": 144,
     "height": 129
    }
   ],
   "x": 12,
   "y": 12,
   "width": 299,
   "height": 153
  }
 ],
 "x": 0,
 "y": 0,
 "width": 323,
 "height": 177
}
`;

const outputRR = `
{
 "id": "root",
 "properties": {
  "algorithm": "layered",
  "org.eclipse.elk.hierarchyHandling": "INCLUDE_CHILDREN",
  "org.eclipse.elk.json.shapeCoords": "ROOT",
  "org.eclipse.elk.json.edgeCoords": "ROOT"
 },
 "children": [
  {
   "id": "A",
   "children": [
    {
     "id": "x",
     "width": 50,
     "height": 90,
     "x": 24,
     "y": 51
    },
    {
     "id": "B",
     "labels": [
      {
       "text": "B",
       "width": 10,
       "height": 12,
       "x": 155,
       "y": 24
      }
     ],
     "ports": [
      {
       "id": "p",
       "width": 10,
       "height": 10,
       "labels": [
        {
         "text": "p",
         "width": 10,
         "height": 12,
         "x": 134,
         "y": 63
        }
       ],
       "x": 145,
       "y": 76
      }
     ],
     "children": [
      {
       "id": "y",
       "width": 50,
       "height": 90,
       "x": 167,
       "y": 36
      },
      {
       "id": "z",
       "width": 50,
       "height": 90,
       "x": 237,
       "y": 51
      }
     ],
     "edges": [
      {
       "id": "e1",
       "sources": [
        "y"
       ],
       "targets": [
        "z"
       ],
       "sections": [
        {
         "id": "e1_s0",
         "startPoint": {
          "x": 217,
          "y": 81
         },
         "endPoint": {
          "x": 237,
          "y": 81
         },
         "incomingShape": "y",
         "outgoingShape": "z"
        }
       ]
      },
      {
       "id": "e2",
       "sources": [
        "x"
       ],
       "targets": [
        "z"
       ],
       "labels": [
        {
         "text": "e2",
         "width": 20,
         "height": 12,
         "x": 94,
         "y": 114
        }
       ],
       "sections": [
        {
         "id": "e2_s0",
         "startPoint": {
          "x": 74,
          "y": 111
         },
         "endPoint": {
          "x": 237,
          "y": 111
         },
         "bendPoints": [
          {
           "x": 124,
           "y": 111
          },
          {
           "x": 124,
           "y": 136
          },
          {
           "x": 227,
           "y": 136
          },
          {
           "x": 227,
           "y": 111
          }
         ],
         "incomingShape": "x",
         "outgoingShape": "z"
        }
       ]
      },
      {
       "id": "e3",
       "sources": [
        "x"
       ],
       "targets": [
        "p"
       ],
       "sections": [
        {
         "id": "e3_s0",
         "startPoint": {
          "x": 74,
          "y": 81
         },
         "endPoint": {
          "x": 145,
          "y": 81
         },
         "incomingShape": "x",
         "outgoingShape": "p"
        }
       ]
      },
      {
       "id": "e4",
       "sources": [
        "p"
       ],
       "targets": [
        "y"
       ],
       "sections": [
        {
         "id": "e4_s0",
         "startPoint": {
          "x": 145,
          "y": 81
         },
         "endPoint": {
          "x": 167,
          "y": 81
         },
         "incomingShape": "p",
         "outgoingShape": "y"
        }
       ]
      }
     ],
     "x": 155,
     "y": 24,
     "width": 144,
     "height": 129
    }
   ],
   "x": 12,
   "y": 12,
   "width": 299,
   "height": 153
  }
 ],
 "x": 0,
 "y": 0,
 "width": 323,
 "height": 177
}
`;

const SHAPE_COORDS = 'org.eclipse.elk.json.shapeCoords';
const EDGE_COORDS = 'org.eclipse.elk.json.edgeCoords';

describe('EdgeCoordsTest', () => {
  it('edgeCoordsTest', () => {
    const cases: readonly (readonly [string, string, string])[] = [
      ['PARENT', 'CONTAINER', outputPC],
      ['PARENT', 'PARENT', outputPP],
      ['PARENT', 'ROOT', outputPR],
      ['ROOT', 'CONTAINER', outputRC],
      ['ROOT', 'PARENT', outputRP],
      ['ROOT', 'ROOT', outputRR],
    ];

    for (const [scm, ecm, expectedOutputString] of cases) {
      const jsonGraph = JsonParser.parseString(graph) as JsonObject;

      const obj = jsonGraph.get('properties')!.getAsJsonObject();
      obj.addProperty(SHAPE_COORDS, scm);
      obj.addProperty(EDGE_COORDS, ecm);

      const mby = new Maybe<JsonImporter>();
      const root = ElkGraphJson.forGraph(jsonGraph).rememberImporter(mby).toElk();

      new RecursiveGraphLayoutEngine().layout(root, new BasicProgressMonitor());

      (mby.get() as JsonImporter).transferLayout(root);

      const computedOutput = jsonGraph;

      const expectedOutput = JsonParser.parseString(expectedOutputString) as JsonObject;

      expect(
        expectedOutput.equals(computedOutput),
        `shapeCoords ${scm}, edgeCoords ${ecm}: expected ${expectedOutput.toString()} but was ${computedOutput.toString()}`,
      ).toBe(true);
    }
  });
});
