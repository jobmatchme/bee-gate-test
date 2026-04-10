{{- define "bee-gate-test.name" -}}
{{- default .Chart.Name .Release.Name -}}
{{- end -}}
