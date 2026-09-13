# Nimbuspost Shipping Test Script
# Run this script to test shipment creation

Write-Host "🚀 Nimbuspost Shipping Test" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Login
Write-Host "Step 1: Logging in..." -ForegroundColor Yellow
$loginBody = @{
    email = "monstermen900@gmail.com"
    password = "your_password_here"  # ⚠️ Update with your admin password
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri http://localhost:5000/api/auth/login -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.data.token
    Write-Host "✅ Logged in! Token received." -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Get Orders
Write-Host "Step 2: Getting orders..." -ForegroundColor Yellow
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    $ordersResponse = Invoke-RestMethod -Uri http://localhost:5000/api/orders -Method GET -Headers $headers
    
    if ($ordersResponse.data.orders -and $ordersResponse.data.orders.Count -gt 0) {
        $orderId = $ordersResponse.data.orders[0].id
        Write-Host "✅ Found Order ID: $orderId" -ForegroundColor Green
        Write-Host ""
    } else {
        Write-Host "⚠️  No orders found. Please create an order first." -ForegroundColor Yellow
        Write-Host "   Or manually enter order ID:" -ForegroundColor Yellow
        $orderId = Read-Host "Enter Order ID"
    }
} catch {
    Write-Host "⚠️  Could not fetch orders. Enter order ID manually:" -ForegroundColor Yellow
    $orderId = Read-Host "Enter Order ID"
}

# Step 3: Create Shipment
Write-Host "Step 3: Creating shipment for order: $orderId" -ForegroundColor Yellow
Write-Host "..."

$shipmentBody = @{
    order_id = $orderId
} | ConvertTo-Json

try {
    $shipmentResponse = Invoke-RestMethod -Uri http://localhost:5000/api/shipping/create -Method POST -Headers $headers -Body $shipmentBody
    
    Write-Host ""
    Write-Host "✅✅✅ SHIPMENT CREATED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📦 Shipment Details:" -ForegroundColor Cyan
    Write-Host "   Order ID: $($shipmentResponse.data.order_id)" -ForegroundColor White
    Write-Host "   AWB Number: $($shipmentResponse.data.awb_number)" -ForegroundColor White
    Write-Host "   Tracking URL: $($shipmentResponse.data.tracking_url)" -ForegroundColor White
    Write-Host "   Status: $($shipmentResponse.data.status)" -ForegroundColor White
    Write-Host ""
    
    # Step 4: Track Shipment
    if ($shipmentResponse.data.awb_number) {
        Write-Host "Step 4: Tracking shipment..." -ForegroundColor Yellow
        $awb = $shipmentResponse.data.awb_number
        
        try {
            $trackResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/shipping/track/$awb" -Method GET -Headers $headers
            Write-Host "✅ Tracking Info:" -ForegroundColor Green
            Write-Host ($trackResponse | ConvertTo-Json -Depth 5)
        } catch {
            Write-Host "⚠️  Tracking not available yet (may take a few minutes)" -ForegroundColor Yellow
        }
    }
    
} catch {
    Write-Host ""
    Write-Host "❌ ERROR Creating Shipment:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host ""
        Write-Host "Response Body:" -ForegroundColor Yellow
        Write-Host $responseBody -ForegroundColor Yellow
        
        # Check if it's an endpoint error
        if ($responseBody -like "*404*" -or $responseBody -like "*not found*") {
            Write-Host ""
            Write-Host "💡 TIP: Check Nimbuspost API documentation and update endpoints in:" -ForegroundColor Cyan
            Write-Host "   backend/src/services/nimbuspost.service.ts" -ForegroundColor Cyan
        }
    }
}

Write-Host ""
Write-Host "Test completed!" -ForegroundColor Cyan
