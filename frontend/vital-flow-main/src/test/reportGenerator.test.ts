import { afterEach, describe, it, expect, vi } from "vitest";
import { generatePDFReport } from "../lib/reportGenerator";

// Mock the entire jspdf module using a dynamic Proxy for the instance
vi.mock("jspdf", () => {
  const mockJsPDFInstance: any = new Proxy(
    {
      splitTextToSize: vi.fn((text) => (typeof text === "string" ? [text] : text)),
      output: vi.fn(() => new Blob(["pdf"], { type: "application/pdf" })),
      save: vi.fn(),
      setFillColor: vi.fn(),
      setDrawColor: vi.fn(),
      setTextColor: vi.fn(),
      setFont: vi.fn(),
      setFontSize: vi.fn(),
      roundedRect: vi.fn(),
      rect: vi.fn(),
      line: vi.fn(),
      text: vi.fn(),
      addPage: vi.fn(),
      circle: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      saveGraphicsState: vi.fn(),
      restoreGraphicsState: vi.fn(),
      setGState: vi.fn(),
      setLineWidth: vi.fn(),
    },
    {
      get(target, prop) {
        if (prop in target) {
          return (target as any)[prop];
        }
        if (typeof prop === "string" && !prop.startsWith("_")) {
          return vi.fn().mockReturnValue(mockJsPDFInstance);
        }
        return undefined;
      },
    }
  );

  return {
    jsPDF: vi.fn().mockImplementation(() => mockJsPDFInstance),
    GState: vi.fn().mockImplementation((opts) => opts),
  };
});

describe("generatePDFReport", () => {
  afterEach(() => {
    vi.restoreAllMocks();
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
      spo2: 98,
      activity: "sitting",
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
      spo2: 98,
      activity: "sitting",
      confidence: 95,
      calibration: 100,
      history: [
        { time: Date.now() - 3600000, value: 95 },
        { time: Date.now(), value: 100 },
      ],
      alerts: [],
    };

    const clickSpy = vi.fn();
    const anchor = document.createElement("a");
    Object.defineProperty(anchor, "click", { value: clickSpy });

    const createElementSpy = vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      if (tagName === "a") {
        return anchor as any;
      }
      return document.createElement(tagName);
    });

    const createObjectURLSpy = vi.fn(() => "blob:mock-url");
    const revokeObjectURLSpy = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { writable: true, value: createObjectURLSpy });
    Object.defineProperty(URL, "revokeObjectURL", { writable: true, value: revokeObjectURLSpy });

    generatePDFReport(dummyData as any);

    expect(createElementSpy).toHaveBeenCalledWith("a");
    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(anchor.download).toContain("Health_Report_");
  });
});
