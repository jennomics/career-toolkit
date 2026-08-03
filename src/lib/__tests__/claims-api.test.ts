import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.mock is hoisted so the factory must be self-contained
vi.mock("@/lib/db", () => {
  const claimMock = {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };
  const claimArtifactMock = {
    findMany: vi.fn(),
    create: vi.fn(),
  };
  const negativeAssertionMock = {
    findMany: vi.fn(),
    create: vi.fn(),
  };
  const claimCorrectionMock = {
    create: vi.fn(),
  };
  const prismaMock = {
    claim: claimMock,
    claimArtifact: claimArtifactMock,
    negativeAssertion: negativeAssertionMock,
    claimCorrection: claimCorrectionMock,
    $transaction: vi.fn(),
  };
  // $transaction calls the callback with the same prisma mock as the tx argument
  prismaMock.$transaction.mockImplementation(async (fn: (tx: typeof prismaMock) => Promise<unknown>) => fn(prismaMock));
  return { prisma: prismaMock };
});

// Import prisma after mock so we get the mocked version
import { prisma } from "@/lib/db";
import { GET as getClaims, POST as postClaim } from "@/app/api/claims/route";
import { GET as getClaimById, PATCH as patchClaim, DELETE as deleteClaim } from "@/app/api/claims/[id]/route";
import { GET as getArtifacts, POST as postArtifact } from "@/app/api/claims/[id]/artifacts/route";
import { POST as postCorrection } from "@/app/api/claims/[id]/correct/route";
import { GET as getNegativeAssertions, POST as postNegativeAssertion } from "@/app/api/claims/[id]/negative-assertions/route";

// Helper to cast prisma methods as mocks
const mockClaim = prisma.claim as unknown as {
  findMany: ReturnType<typeof vi.fn>;
  findFirst: ReturnType<typeof vi.fn>;
  findUnique: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
};
const mockClaimArtifact = prisma.claimArtifact as unknown as {
  findMany: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
};
const mockNegativeAssertion = prisma.negativeAssertion as unknown as {
  findMany: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
};
const mockClaimCorrection = prisma.claimCorrection as unknown as {
  create: ReturnType<typeof vi.fn>;
};

function makeRequest(url: string, options?: RequestInit): Request {
  return new Request(url, options);
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("Claims API - POST /api/claims", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires claimKey and statement", async () => {
    const req = makeRequest("http://localhost/api/claims", {
      method: "POST",
      body: JSON.stringify({ category: "numeric" }),
    });
    const res = await postClaim(req as never);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error.code).toBe("VALIDATION_ERROR");
    expect(data.error.message).toContain("claimKey and statement are required");
  });

  it("validates category is one of the allowed values", async () => {
    const req = makeRequest("http://localhost/api/claims", {
      method: "POST",
      body: JSON.stringify({ claimKey: "test", statement: "test", category: "invalid" }),
    });
    const res = await postClaim(req as never);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error.code).toBe("VALIDATION_ERROR");
    expect(data.error.message).toContain("category is required");
  });

  it("returns 409 when claimKey has existing active claim", async () => {
    const existingClaim = {
      id: "existing-1",
      claimKey: "years-experience",
      statement: "10 years",
      category: "numeric",
      status: "unverified",
    };
    mockClaim.findFirst.mockResolvedValue(existingClaim);

    const req = makeRequest("http://localhost/api/claims", {
      method: "POST",
      body: JSON.stringify({
        claimKey: "years-experience",
        statement: "12 years",
        category: "numeric",
      }),
    });
    const res = await postClaim(req as never);
    const data = await res.json();
    expect(res.status).toBe(409);
    expect(data.error.code).toBe("CONFLICT");
    expect(data.existingClaim.id).toBe("existing-1");
    expect(data.attemptedClaim.statement).toBe("12 years");
  });

  it("creates a claim when no conflict exists", async () => {
    mockClaim.findFirst.mockResolvedValue(null);
    const createdClaim = {
      id: "new-1",
      claimKey: "years-experience",
      statement: "10 years",
      category: "numeric",
      status: "unverified",
      artifacts: [],
      negativeAssertions: [],
    };
    mockClaim.create.mockResolvedValue(createdClaim);

    const req = makeRequest("http://localhost/api/claims", {
      method: "POST",
      body: JSON.stringify({
        claimKey: "years-experience",
        statement: "10 years",
        category: "numeric",
      }),
    });
    const res = await postClaim(req as never);
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.id).toBe("new-1");
    expect(data.statement).toBe("10 years");
  });

  it("accepts valid status parameter", async () => {
    mockClaim.findFirst.mockResolvedValue(null);
    mockClaim.create.mockResolvedValue({
      id: "new-1",
      claimKey: "k",
      statement: "s",
      category: "numeric",
      status: "verified",
      artifacts: [],
      negativeAssertions: [],
    });

    const req = makeRequest("http://localhost/api/claims", {
      method: "POST",
      body: JSON.stringify({
        claimKey: "k",
        statement: "s",
        category: "numeric",
        status: "verified",
      }),
    });
    const res = await postClaim(req as never);
    expect(res.status).toBe(201);
  });

  it("rejects invalid status parameter", async () => {
    const req = makeRequest("http://localhost/api/claims", {
      method: "POST",
      body: JSON.stringify({
        claimKey: "k",
        statement: "s",
        category: "numeric",
        status: "invalid-status",
      }),
    });
    const res = await postClaim(req as never);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error.message).toContain("Invalid status");
  });
});

describe("Claims API - GET /api/claims", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns claims list", async () => {
    mockClaim.findMany.mockResolvedValue([
      { id: "1", claimKey: "k", statement: "s", category: "numeric", status: "unverified" },
    ]);

    const req = makeRequest("http://localhost/api/claims");
    const res = await getClaims(req as never);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
  });

  it("filters by status", async () => {
    mockClaim.findMany.mockResolvedValue([]);

    const req = makeRequest("http://localhost/api/claims?status=verified");
    const res = await getClaims(req as never);
    expect(res.status).toBe(200);
    expect(mockClaim.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "verified" }),
      })
    );
  });

  it("rejects invalid status filter", async () => {
    const req = makeRequest("http://localhost/api/claims?status=bogus");
    const res = await getClaims(req as never);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error.message).toContain("Invalid status");
  });

  it("rejects invalid category filter", async () => {
    const req = makeRequest("http://localhost/api/claims?category=bogus");
    const res = await getClaims(req as never);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error.message).toContain("Invalid category");
  });

  it("filters by claimKey", async () => {
    mockClaim.findMany.mockResolvedValue([]);

    const req = makeRequest("http://localhost/api/claims?claimKey=years-experience");
    const res = await getClaims(req as never);
    expect(res.status).toBe(200);
    expect(mockClaim.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ claimKey: "years-experience" }),
      })
    );
  });
});

describe("Claims API - GET /api/claims/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 for non-existent claim", async () => {
    mockClaim.findUnique.mockResolvedValue(null);

    const req = makeRequest("http://localhost/api/claims/nonexistent");
    const res = await getClaimById(req as never, makeParams("nonexistent") as never);
    const data = await res.json();
    expect(res.status).toBe(404);
    expect(data.error.code).toBe("NOT_FOUND");
  });

  it("returns claim with relations", async () => {
    mockClaim.findUnique.mockResolvedValue({
      id: "1",
      claimKey: "k",
      statement: "s",
      artifacts: [],
      negativeAssertions: [],
      corrections: [],
    });

    const req = makeRequest("http://localhost/api/claims/1");
    const res = await getClaimById(req as never, makeParams("1") as never);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.id).toBe("1");
  });
});

describe("Claims API - PATCH /api/claims/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires at least one field", async () => {
    mockClaim.findUnique.mockResolvedValue({ id: "1" });

    const req = makeRequest("http://localhost/api/claims/1", {
      method: "PATCH",
      body: JSON.stringify({}),
    });
    const res = await patchClaim(req as never, makeParams("1") as never);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error.message).toContain("At least one field");
  });

  it("validates category", async () => {
    mockClaim.findUnique.mockResolvedValue({ id: "1" });

    const req = makeRequest("http://localhost/api/claims/1", {
      method: "PATCH",
      body: JSON.stringify({ category: "bad" }),
    });
    const res = await patchClaim(req as never, makeParams("1") as never);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error.message).toContain("Invalid category");
  });

  it("validates status", async () => {
    mockClaim.findUnique.mockResolvedValue({ id: "1" });

    const req = makeRequest("http://localhost/api/claims/1", {
      method: "PATCH",
      body: JSON.stringify({ status: "bad" }),
    });
    const res = await patchClaim(req as never, makeParams("1") as never);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error.message).toContain("Invalid status");
  });

  it("updates fields successfully", async () => {
    mockClaim.findUnique.mockResolvedValue({ id: "1" });
    mockClaim.update.mockResolvedValue({
      id: "1",
      statement: "updated",
      artifacts: [],
      negativeAssertions: [],
      corrections: [],
    });

    const req = makeRequest("http://localhost/api/claims/1", {
      method: "PATCH",
      body: JSON.stringify({ statement: "updated" }),
    });
    const res = await patchClaim(req as never, makeParams("1") as never);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.statement).toBe("updated");
  });
});

describe("Claims API - DELETE /api/claims/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("soft-deletes by setting status to superseded", async () => {
    mockClaim.findUnique.mockResolvedValue({ id: "1", status: "unverified" });
    mockClaim.update.mockResolvedValue({ id: "1", status: "superseded" });

    const req = makeRequest("http://localhost/api/claims/1", { method: "DELETE" });
    const res = await deleteClaim(req as never, makeParams("1") as never);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.status).toBe("superseded");
    expect(mockClaim.update).toHaveBeenCalledWith({
      where: { id: "1" },
      data: { status: "superseded" },
    });
  });
});

describe("Claims API - POST /api/claims/[id]/artifacts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires passageText", async () => {
    const req = makeRequest("http://localhost/api/claims/1/artifacts", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await postArtifact(req as never, makeParams("1") as never);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error.message).toContain("passageText is required");
  });

  it("returns 404 when claim does not exist", async () => {
    mockClaim.findUnique.mockResolvedValue(null);

    const req = makeRequest("http://localhost/api/claims/1/artifacts", {
      method: "POST",
      body: JSON.stringify({ passageText: "some text" }),
    });
    const res = await postArtifact(req as never, makeParams("1") as never);
    const data = await res.json();
    expect(res.status).toBe(404);
    expect(data.error.code).toBe("NOT_FOUND");
  });

  it("creates artifact without mutating claim statement", async () => {
    mockClaim.findUnique.mockResolvedValue({ id: "1", statement: "original" });
    mockClaimArtifact.create.mockResolvedValue({
      id: "a1",
      claimId: "1",
      passageText: "evidence passage",
      passageLocation: "resume p1",
    });

    const req = makeRequest("http://localhost/api/claims/1/artifacts", {
      method: "POST",
      body: JSON.stringify({ passageText: "evidence passage", passageLocation: "resume p1" }),
    });
    const res = await postArtifact(req as never, makeParams("1") as never);
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.passageText).toBe("evidence passage");
    // Claim update should NOT have been called
    expect(mockClaim.update).not.toHaveBeenCalled();
  });
});

describe("Claims API - GET /api/claims/[id]/artifacts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns artifacts list for a claim", async () => {
    mockClaim.findUnique.mockResolvedValue({ id: "1" });
    mockClaimArtifact.findMany.mockResolvedValue([
      { id: "a1", claimId: "1", passageText: "text" },
    ]);

    const req = makeRequest("http://localhost/api/claims/1/artifacts");
    const res = await getArtifacts(req as never, makeParams("1") as never);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
  });
});

describe("Claims API - POST /api/claims/[id]/correct", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires previousValue and correctedValue", async () => {
    const req = makeRequest("http://localhost/api/claims/1/correct", {
      method: "POST",
      body: JSON.stringify({ previousValue: "old" }),
    });
    const res = await postCorrection(req as never, makeParams("1") as never);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error.message).toContain("previousValue and correctedValue are required");
  });

  it("returns 404 for non-existent claim", async () => {
    mockClaim.findUnique.mockResolvedValue(null);

    const req = makeRequest("http://localhost/api/claims/1/correct", {
      method: "POST",
      body: JSON.stringify({ previousValue: "old", correctedValue: "new" }),
    });
    const res = await postCorrection(req as never, makeParams("1") as never);
    const data = await res.json();
    expect(res.status).toBe(404);
    expect(data.error.code).toBe("NOT_FOUND");
  });

  it("atomically corrects a claim", async () => {
    mockClaim.findUnique.mockResolvedValue({
      id: "1",
      statement: "10 years",
      corrections: [],
      negativeAssertions: [],
    });
    mockClaim.update.mockResolvedValue({
      id: "1",
      statement: "12 years",
    });
    mockClaimCorrection.create.mockResolvedValue({
      id: "c1",
      claimId: "1",
      previousValue: "10 years",
      correctedValue: "12 years",
      source: "user-ui",
    });
    mockNegativeAssertion.create.mockResolvedValue({
      id: "na1",
      claimId: "1",
      forbiddenText: "10 years",
      reason: 'Corrected from "10 years" to "12 years"',
    });

    const req = makeRequest("http://localhost/api/claims/1/correct", {
      method: "POST",
      body: JSON.stringify({ previousValue: "10 years", correctedValue: "12 years" }),
    });
    const res = await postCorrection(req as never, makeParams("1") as never);
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.claim.statement).toBe("12 years");
    expect(data.correction.previousValue).toBe("10 years");
    expect(data.negativeAssertion.forbiddenText).toBe("10 years");
    expect(data.idempotent).toBe(false);
  });

  it("is idempotent when same correction applied twice", async () => {
    const existingCorrection = {
      id: "c1",
      previousValue: "10 years",
      correctedValue: "12 years",
      source: "user-ui",
    };
    const existingAssertion = {
      id: "na1",
      forbiddenText: "10 years",
      reason: "corrected",
    };

    mockClaim.findUnique.mockResolvedValue({
      id: "1",
      statement: "12 years", // already corrected
      corrections: [existingCorrection],
      negativeAssertions: [existingAssertion],
    });

    const req = makeRequest("http://localhost/api/claims/1/correct", {
      method: "POST",
      body: JSON.stringify({ previousValue: "10 years", correctedValue: "12 years" }),
    });
    const res = await postCorrection(req as never, makeParams("1") as never);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.idempotent).toBe(true);
    // Should NOT have called update/create again
    expect(mockClaim.update).not.toHaveBeenCalled();
    expect(mockClaimCorrection.create).not.toHaveBeenCalled();
    expect(mockNegativeAssertion.create).not.toHaveBeenCalled();
  });
});

describe("Claims API - Negative Assertions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET returns negative assertions for a claim", async () => {
    mockClaim.findUnique.mockResolvedValue({ id: "1" });
    mockNegativeAssertion.findMany.mockResolvedValue([
      { id: "na1", claimId: "1", forbiddenText: "old wording", reason: "corrected" },
    ]);

    const req = makeRequest("http://localhost/api/claims/1/negative-assertions");
    const res = await getNegativeAssertions(req as never, makeParams("1") as never);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].forbiddenText).toBe("old wording");
  });

  it("POST requires forbiddenText and reason", async () => {
    const req = makeRequest("http://localhost/api/claims/1/negative-assertions", {
      method: "POST",
      body: JSON.stringify({ forbiddenText: "something" }),
    });
    const res = await postNegativeAssertion(req as never, makeParams("1") as never);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error.message).toContain("forbiddenText and reason are required");
  });

  it("POST creates a negative assertion", async () => {
    mockClaim.findUnique.mockResolvedValue({ id: "1" });
    mockNegativeAssertion.create.mockResolvedValue({
      id: "na2",
      claimId: "1",
      forbiddenText: "wrong thing",
      reason: "never say this",
    });

    const req = makeRequest("http://localhost/api/claims/1/negative-assertions", {
      method: "POST",
      body: JSON.stringify({ forbiddenText: "wrong thing", reason: "never say this" }),
    });
    const res = await postNegativeAssertion(req as never, makeParams("1") as never);
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.forbiddenText).toBe("wrong thing");
  });
});
