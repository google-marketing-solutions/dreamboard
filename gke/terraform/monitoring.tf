# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# Cloud Monitoring Dashboard and Alerts for Dreamboard

# Enable Monitoring API
resource "google_project_service" "monitoring" {
  service            = "monitoring.googleapis.com"
  disable_on_destroy = false
  depends_on = [
    google_project_service.apis
  ]
}

# Create monitoring notification channel for email alerts
resource "google_monitoring_notification_channel" "email" {
  display_name = "Dreamboard Alerts Email"
  type         = "email"
  labels = {
    email_address = var.alert_email
  }
  enabled = true
}

# Alert Policy: High Error Rate (>1%)
resource "google_monitoring_alert_policy" "high_error_rate" {
  display_name = "Dreamboard: High Error Rate"
  combiner     = "OR"
  enabled      = true

  conditions {
    display_name = "Error rate > 1%"

    condition_threshold {
      filter          = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"dreamboard-backend\" AND metric.type=\"run.googleapis.com/request_count\" AND metric.labels.response_code_class=\"5xx\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 0.01

      aggregations {
        alignment_period  = "60s"
        per_series_aligner = "ALIGN_RATE"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]

  alert_strategy {
    notification_rate_limit {
      period = "3600s"
    }
  }
}

# Alert Policy: High Latency (p95 > 3s)
resource "google_monitoring_alert_policy" "high_latency" {
  display_name = "Dreamboard: High Latency"
  combiner     = "OR"
  enabled      = true

  conditions {
    display_name = "Latency p95 > 3s"

    condition_threshold {
      filter          = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"dreamboard-backend\" AND metric.type=\"run.googleapis.com/request_latencies\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 3000 # milliseconds

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_PERCENTILE_95"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]

  alert_strategy {
    notification_rate_limit {
      period = "3600s"
    }
  }
}

# Alert Policy: Backend Service Down
resource "google_monitoring_alert_policy" "service_down" {
  display_name = "Dreamboard Backend: Service Down"
  combiner     = "OR"
  enabled      = true

  conditions {
    display_name = "Service unavailable"

    condition_threshold {
      filter          = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"dreamboard-backend\" AND metric.type=\"run.googleapis.com/request_count\""
      duration        = "180s"
      comparison      = "COMPARISON_LT"
      threshold_value = 1

      aggregations {
        alignment_period  = "60s"
        per_series_aligner = "ALIGN_RATE"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]

  alert_strategy {
    notification_rate_limit {
      period = "600s"
    }
  }
}

# Alert Policy: Memory Usage Too High
resource "google_monitoring_alert_policy" "high_memory" {
  display_name = "Dreamboard: High Memory Usage"
  combiner     = "OR"
  enabled      = true

  conditions {
    display_name = "Memory usage > 80%"

    condition_threshold {
      filter          = "resource.type=\"cloud_run_revision\" AND metric.type=\"run.googleapis.com/execution_times\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 0.8

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]

  alert_strategy {
    notification_rate_limit {
      period = "3600s"
    }
  }
}

# Monitoring Dashboard
resource "google_monitoring_dashboard" "dreamboard" {
  dashboard_json = jsonencode({
    displayName = "Dreamboard Performance Dashboard"
    mosaicLayout = {
      columns = 12
      tiles = [
        # Backend Request Rate
        {
          width  = 6
          height = 4
          widget = {
            title = "Backend Request Rate"
            xyChart = {
              dataSets = [
                {
                  timeSeriesQuery = {
                    timeSeriesFilter = {
                      filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"dreamboard-backend\" AND metric.type=\"run.googleapis.com/request_count\""
                      aggregation = {
                        alignmentPeriod  = "60s"
                        perSeriesAligner = "ALIGN_RATE"
                      }
                    }
                  }
                  plotType = "LINE"
                }
              ]
            }
          }
        }

        # Backend Error Rate
        {
          xPos   = 6
          width  = 6
          height = 4
          widget = {
            title = "Backend Error Rate (5xx)"
            xyChart = {
              dataSets = [
                {
                  timeSeriesQuery = {
                    timeSeriesFilter = {
                      filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"dreamboard-backend\" AND metric.type=\"run.googleapis.com/request_count\" AND metric.labels.response_code_class=\"5xx\""
                      aggregation = {
                        alignmentPeriod  = "60s"
                        perSeriesAligner = "ALIGN_RATE"
                      }
                    }
                  }
                  plotType = "LINE"
                }
              ]
            }
          }
        }

        # Backend Latency (p50, p95, p99)
        {
          yPos   = 4
          width  = 12
          height = 4
          widget = {
            title = "Backend Latency Percentiles"
            xyChart = {
              dataSets = [
                {
                  timeSeriesQuery = {
                    timeSeriesFilter = {
                      filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"dreamboard-backend\" AND metric.type=\"run.googleapis.com/request_latencies\""
                      aggregation = {
                        alignmentPeriod   = "60s"
                        perSeriesAligner  = "ALIGN_PERCENTILE_95"
                        crossSeriesReducer = "REDUCE_NONE"
                      }
                    }
                  }
                  plotType = "LINE"
                }
              ]
            }
          }
        }

        # Frontend Request Rate
        {
          yPos   = 8
          width  = 6
          height = 4
          widget = {
            title = "Frontend Request Rate"
            xyChart = {
              dataSets = [
                {
                  timeSeriesQuery = {
                    timeSeriesFilter = {
                      filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"dreamboard-frontend\" AND metric.type=\"run.googleapis.com/request_count\""
                      aggregation = {
                        alignmentPeriod  = "60s"
                        perSeriesAligner = "ALIGN_RATE"
                      }
                    }
                  }
                  plotType = "LINE"
                }
              ]
            }
          }
        }

        # Frontend Error Rate
        {
          xPos   = 6
          yPos   = 8
          width  = 6
          height = 4
          widget = {
            title = "Frontend Error Rate (5xx)"
            xyChart = {
              dataSets = [
                {
                  timeSeriesQuery = {
                    timeSeriesFilter = {
                      filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"dreamboard-frontend\" AND metric.type=\"run.googleapis.com/request_count\" AND metric.labels.response_code_class=\"5xx\""
                      aggregation = {
                        alignmentPeriod  = "60s"
                        perSeriesAligner = "ALIGN_RATE"
                      }
                    }
                  }
                  plotType = "LINE"
                }
              ]
            }
          }
        }

        # GCS Operations
        {
          yPos   = 12
          width  = 6
          height = 4
          widget = {
            title = "GCS Operations (Reads)"
            xyChart = {
              dataSets = [
                {
                  timeSeriesQuery = {
                    timeSeriesFilter = {
                      filter = "resource.type=\"gcs_bucket\" AND metric.type=\"storage.googleapis.com/storage/total_bytes\""
                      aggregation = {
                        alignmentPeriod  = "60s"
                        perSeriesAligner = "ALIGN_MEAN"
                      }
                    }
                  }
                  plotType = "LINE"
                }
              ]
            }
          }
        }

        # Firestore Operations
        {
          xPos   = 6
          yPos   = 12
          width  = 6
          height = 4
          widget = {
            title = "Firestore Reads"
            xyChart = {
              dataSets = [
                {
                  timeSeriesQuery = {
                    timeSeriesFilter = {
                      filter = "resource.type=\"cloud_firestore_database\" AND metric.type=\"firestore.googleapis.com/instance/read_operations\""
                      aggregation = {
                        alignmentPeriod  = "60s"
                        perSeriesAligner = "ALIGN_RATE"
                      }
                    }
                  }
                  plotType = "LINE"
                }
              ]
            }
          }
        }
      ]
    }
  })

  depends_on = [google_project_service.monitoring]
}

# Log-based metrics for custom monitoring
resource "google_logging_metric" "api_errors" {
  name   = "dreamboard_api_errors"
  filter = "resource.type=\"cloud_run_revision\" AND severity=\"ERROR\""

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
    labels {
      key         = "service"
      value_type  = "STRING"
      description = "Cloud Run service name"
    }
  }
}

# Outputs
output "monitoring_dashboard_url" {
  description = "URL to the monitoring dashboard"
  value       = "https://console.cloud.google.com/monitoring/dashboards?project=${var.project_id}"
}

output "alert_policy_ids" {
  description = "IDs of configured alert policies"
  value = {
    high_error_rate = google_monitoring_alert_policy.high_error_rate.id
    high_latency    = google_monitoring_alert_policy.high_latency.id
    service_down    = google_monitoring_alert_policy.service_down.id
    high_memory     = google_monitoring_alert_policy.high_memory.id
  }
}
