import { KeyboardCode, type ClientRect, type DroppableContainer } from "@dnd-kit/core";
import { describe, expect, it, vi } from "vitest";

import {
  createPlannerCollisionDetection,
  createPlannerKeyboardCoordinates,
  plannerCollisionDetection,
  plannerKeyboardCoordinates,
} from "./simple-day-planner";

function rect(top: number, height = 40, left = 0, width = 240): ClientRect {
  return {
    top,
    bottom: top + height,
    left,
    right: left + width,
    width,
    height,
  };
}

function droppable(
  id: string,
  data:
    | { kind: "block"; blockId: string; label: string; taskCount: number }
    | { kind: "task"; blockId: string; taskId: string; label: string },
): DroppableContainer {
  return {
    id,
    key: id,
    data: { current: data },
    disabled: false,
    node: { current: null },
    rect: { current: null },
  };
}

const taskA = droppable("task:a", {
  kind: "task",
  blockId: "morning",
  taskId: "a",
  label: "Erste Aufgabe",
});
const taskB = droppable("task:b", {
  kind: "task",
  blockId: "morning",
  taskId: "b",
  label: "Zweite Aufgabe",
});
const taskC = droppable("task:c", {
  kind: "task",
  blockId: "evening",
  taskId: "c",
  label: "Dritte Aufgabe",
});
const morningBlock = droppable("block:morning", {
  kind: "block",
  blockId: "morning",
  label: "Morgen Block",
  taskCount: 2,
});
const eveningBlock = droppable("block:evening", {
  kind: "block",
  blockId: "evening",
  label: "Abend Block",
  taskCount: 1,
});

describe("Sortierzugänglichkeit des Tagesplaners", () => {
  it("überspringt bei Aufgaben die konkurrierenden Block-Ziele", () => {
    const droppableRects = new Map([
      [morningBlock.id, rect(0, 160)],
      [taskA.id, rect(40)],
      [taskB.id, rect(90)],
      [eveningBlock.id, rect(200, 100)],
      [taskC.id, rect(240)],
    ]);

    const collisions = plannerCollisionDetection({
      active: {
        id: taskA.id,
        data: taskA.data,
        rect: { current: { initial: rect(40), translated: rect(88) } },
      },
      collisionRect: rect(88),
      droppableRects,
      droppableContainers: [morningBlock, taskA, taskB, eveningBlock, taskC],
      pointerCoordinates: { x: 20, y: 100 },
    });

    expect(collisions.map(({ id }) => id)).toEqual([taskB.id, taskA.id, taskC.id]);
  });

  it("bewegt eine Aufgabe mit jeder Pfeiltaste exakt zum nächsten sichtbaren Eintrag", () => {
    const containers = [morningBlock, taskA, taskB, eveningBlock, taskC];
    const droppableRects = new Map([
      [morningBlock.id, rect(0, 160)],
      [taskA.id, rect(40)],
      [taskB.id, rect(90)],
      [eveningBlock.id, rect(200, 100)],
      [taskC.id, rect(240)],
    ]);
    const preventDefault = vi.fn();
    const keyboardTarget = { current: null };
    const keyboardCoordinates = createPlannerKeyboardCoordinates(keyboardTarget);
    const collisionDetection = createPlannerCollisionDetection(keyboardTarget);
    const context = {
      active: {
        id: taskA.id,
        data: taskA.data,
        rect: { current: { initial: rect(40), translated: rect(40) } },
      },
      collisionRect: rect(40),
      droppableRects,
      droppableContainers: { getEnabled: () => containers },
      // dnd-kit may report the next row as `over` immediately on keyboard lift.
      // The first ArrowDown must still move only from A to B, not from B to C.
      over: {
        id: taskB.id,
        data: taskB.data,
        rect: rect(90),
        disabled: false,
      },
    };

    const firstMove = keyboardCoordinates(
      { code: KeyboardCode.Down, preventDefault } as unknown as KeyboardEvent,
      {
        active: taskA.id,
        currentCoordinates: { x: 0, y: 40 },
        context: context as Parameters<typeof keyboardCoordinates>[1]["context"],
      },
    );
    expect(firstMove).toEqual({ x: 0, y: 90 });
    expect(keyboardTarget.current).toBe(taskB.id);

    // In the real sortable layout the neighbouring rows transform immediately.
    // Even if geometry would now favour the row after it, the chosen one-step
    // keyboard target must remain authoritative until the next arrow key.
    const transformedCollisions = collisionDetection({
      active: {
        id: taskA.id,
        data: taskA.data,
        rect: { current: { initial: rect(40), translated: rect(230) } },
      },
      collisionRect: rect(230),
      droppableRects,
      droppableContainers: containers,
      pointerCoordinates: null,
    });
    expect(transformedCollisions.map(({ id }) => id)).toEqual([taskB.id]);

    const secondMove = keyboardCoordinates(
      { code: KeyboardCode.Down, preventDefault } as unknown as KeyboardEvent,
      {
        active: taskA.id,
        currentCoordinates: { x: 0, y: 90 },
        context: {
          ...context,
          collisionRect: rect(90),
          over: {
            id: taskB.id,
            data: taskB.data,
            rect: rect(90),
            disabled: false,
          },
        } as Parameters<typeof keyboardCoordinates>[1]["context"],
      },
    );
    expect(secondMove).toEqual({ x: 0, y: 240 });
    expect(keyboardTarget.current).toBe(taskC.id);
    expect(preventDefault).toHaveBeenCalledTimes(2);
  });

  it("sortiert einen Block nur gegen andere Blöcke", () => {
    const containers = [morningBlock, taskA, taskB, eveningBlock, taskC];
    const droppableRects = new Map([
      [morningBlock.id, rect(0, 160)],
      [taskA.id, rect(40)],
      [taskB.id, rect(90)],
      [eveningBlock.id, rect(200, 100)],
      [taskC.id, rect(240)],
    ]);

    const move = plannerKeyboardCoordinates(
      { code: KeyboardCode.Down, preventDefault: vi.fn() } as unknown as KeyboardEvent,
      {
        active: morningBlock.id,
        currentCoordinates: { x: 0, y: 0 },
        context: {
          active: {
            id: morningBlock.id,
            data: morningBlock.data,
            rect: { current: { initial: rect(0, 160), translated: rect(0, 160) } },
          },
          collisionRect: rect(0, 160),
          droppableRects,
          droppableContainers: { getEnabled: () => containers },
          over: null,
        } as Parameters<typeof plannerKeyboardCoordinates>[1]["context"],
      },
    );

    expect(move).toEqual({ x: 0, y: 170 });
  });
});
