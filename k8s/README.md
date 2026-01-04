# NubDB Kubernetes Deployment

This directory contains Kubernetes manifests for deploying NubDB.

## Files

- `namespace.yaml` - Creates the nubdb namespace
- `deployment.yaml` - Deployment, Service, and PVC
- `service-nodeport.yaml` - NodePort service (optional, for external access)

## Quick Start

### Deploy to Kubernetes

```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Deploy NubDB
kubectl apply -f k8s/deployment.yaml

# (Optional) Expose via NodePort
kubectl apply -f k8s/service-nodeport.yaml
```

### Verify Deployment

```bash
# Check pods
kubectl get pods -n nubdb

# Check services
kubectl get svc -n nubdb

# View logs
kubectl logs -n nubdb -l app=nubdb -f
```

### Access NubDB

#### From within the cluster:

```bash
# Connect to nubdb-service:6379
kubectl run -it --rm debug --image=alpine --restart=Never -n nubdb -- sh
apk add netcat-openbsd
echo "SET test 123" | nc nubdb-service 6379
```

#### From outside the cluster (if using NodePort):

```bash
# Get node IP
kubectl get nodes -o wide

# Connect via NodePort (30379)
echo "SET test 123" | nc <NODE_IP> 30379
```

#### Port forwarding:

```bash
# Forward port 6379 to localhost
kubectl port-forward -n nubdb svc/nubdb-service 6379:6379

# In another terminal
echo "SET test 123" | nc localhost 6379
```

## Scaling

NubDB currently supports single-instance deployment only (no replication).

## Persistence

Data is stored in a PersistentVolumeClaim (10Gi by default). Adjust in `deployment.yaml`:

```yaml
spec:
  resources:
    requests:
      storage: 50Gi  # Change size here
```

## Resource Limits

Default limits:
- CPU: 2 cores (limit), 500m (request)
- Memory: 2Gi (limit), 512Mi (request)

Adjust in `deployment.yaml` as needed.

## Monitoring

Check health:

```bash
# Pod status
kubectl get pods -n nubdb

# Describe pod
kubectl describe pod -n nubdb -l app=nubdb

# View events
kubectl get events -n nubdb --sort-by='.lastTimestamp'
```

## Cleanup

```bash
# Delete all resources
kubectl delete -f k8s/

# Delete PVC data (destructive!)
kubectl delete pvc -n nubdb nubdb-pvc
```
