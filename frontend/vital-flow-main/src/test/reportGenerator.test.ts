import { afterEach, describe, it, expect, vi } from "vitest";
import { generatePDFReport } from "../lib/reportGenerator";

// Mock the entire jspdf module using a dynamic Proxy for the instance
vi.mock("jspdf", () => {
  const createMockDoc = () => {
    const targetObj: any = {};
    const methods = [
      "splitTextToSize", "output", "save", "setFillColor", "setDrawColor",
      "setTextColor", "setFont", "setFontSize", "roundedRect", "rect",
      "line", "text", "addPage", "circle", "moveTo", "lineTo", "closePath",
      "fill", "stroke", "saveGraphicsState", "restoreGraphicsState", "setGState", "setLineWidth"
    ];
    methods.forEach((m) => {
      targetObj[m] = vi.fn().mockImplementation((...args: any[]) => {
        if (m === "splitTextToSize") {
          return typeof args[0] === "string" ? [args[0]] : args[0];
        }
        if (m === "output") {
          return new Blob(["pdf"], { type: "application/pdf" });
        }
        return targetObj;
      });
    });

    return new Proxy(targetObj, {
      get(target, prop) {
        if (prop in target) return target[prop];
        if (typeof prop === "string" && !prop.startsWith("_")) {
          target[prop] = vi.fn().mockReturnValue(target);
          return target[prop];
        }
        return undefined;
      },
    });
  };

  return {
    jsPDF: vi.fn().mockImplementation(() => createMockDoc()),
    GState: vi.fn().mockImplementation((opts) => opts),
  };
});

describe("generatePDFReport", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should generate report PDF without throwing errors", () => {
    const dummyData = {
      user: {
        name: "Test User",
        email: "test@example.com",
        age: 30,
        gender: "Male",
        height: 180,
        weight: 75,
        dob: "1996-01-01",
        phone: "123-456-7890",
      },
      currentGlucose: 100,
      trend: "Stable",
      healthScore: 92,
      healthCategory: "Excellent",
      healthExplanation: "Everything is stable.",
      healthRecommendations: ["Drink water", "Walk"],
      heartRate: 72,
      temperature: 36.6,
      stress: "low",
      activity: "Stationary",
      confidence: 95,
      calibration: 100,
      history: [
        { time: Date.now() - 3600000, value: 95 },
        { time: Date.now(), value: 100 },
      ],
      alerts: [],
    };

    expect(() => generatePDFReport(dummyData as any)).not.toThrow();
  });

  it("should trigger a browser download when the DOM is available", () => {
    const dummyData = {
      user: {
        name: "Test User",
        email: "test@example.com",
        age: 30,
        gender: "Male",
        height: 180,
        weight: 75,
        dob: "1996-01-01",
        phone: "123-456-7890",
      },
      currentGlucose: 100,
      trend: "Stable",
      healthScore: 92,
      healthCategory: "Excellent",
      healthExplanation: "Everything is stable.",
      healthRecommendations: ["Drink water", "Walk"],
      heartRate: 72,
      temperature: 36.6,
      stress: "low",
      activity: "Stationary",
      confidence: 95,
      calibration: 100,
      history: [
        { time: Date.now() - 3600000, value: 95 },
        { time: Date.now(), value: 100 },
      ],
      alerts: [],
    };

    expect(() => generatePDFReport(dummyData as any)).not.toThrow();
  });
});
