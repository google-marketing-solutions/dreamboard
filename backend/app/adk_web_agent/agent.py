# Copyright 2025 Google Inc
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

from services.agent.agent_service import AgentService
from dotenv import load_dotenv

agent_service = AgentService()
load_dotenv()
root_agent_name = "orchestor_agent"
root_agent = agent_service.lookup_agent(root_agent_name).agent
