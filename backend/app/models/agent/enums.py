from enum import Enum


class AgentType(Enum):
  LLM = "LLM"
  Sequential = "Sequential"
  Parallel = "Parallel"
  Loop = "Loop"


class AgentNames(Enum):
  ROOT = "root_agent"
