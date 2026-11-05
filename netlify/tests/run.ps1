param(
  [string]$BaseUrl = "http://localhost:8888/.netlify/functions"
)

function Send-Test($name, $endpoint, $json, $expected) {
  $uri = "$BaseUrl/$endpoint"
  try {
    $res = Invoke-WebRequest -Method Post -Uri $uri -ContentType "application/json" -Body $json -UseBasicParsing
    $status = [int]$res.StatusCode
    $body = $res.Content
  } catch {
    $status = [int]$_.Exception.Response.StatusCode
    $body = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
  }
  $result = if ($status -eq $expected) { "PASS" } else { "FAIL" }
  Write-Host "$result  $name  (got $status, expected $expected)"
  Write-Host "      $body"
}

$cFull = Get-Content "$PSScriptRoot\consultation-full.json" -Raw
$cMin = Get-Content "$PSScriptRoot\consultation-min.json" -Raw
$cInvalid = Get-Content "$PSScriptRoot\consultation-invalid.json" -Raw
$bFull = Get-Content "$PSScriptRoot\booking-full.json" -Raw
$bMin = Get-Content "$PSScriptRoot\booking-min.json" -Raw
$bInvalid = Get-Content "$PSScriptRoot\booking-invalid.json" -Raw

Write-Host "--- Flow 1: consultation ---"
Send-Test "full submission (sends email)" "submit-consultation" $cFull 200
Send-Test "required fields only (sends email)" "submit-consultation" $cMin 200
Send-Test "missing required fields" "submit-consultation" $cInvalid 400
Send-Test "http file link rejected" "submit-consultation" ($cFull -replace "https://res.cloudinary.com/demo/raw/upload/sample.pdf", "http://insecure.example.com/x.pdf") 400
Send-Test "honeypot filled (no email)" "submit-consultation" ($cFull -replace '"website": ""', '"website": "http://spam.com"') 200
Send-Test "not json" "submit-consultation" "not json" 400

Write-Host ""
Write-Host "--- Flow 2: booking ---"
Send-Test "full booking (sends email)" "submit-booking" $bFull 200
Send-Test "required fields only (sends email)" "submit-booking" $bMin 200
Send-Test "missing required fields" "submit-booking" $bInvalid 400
Send-Test "honeypot filled (no email)" "submit-booking" ($bFull -replace '"website": ""', '"website": "http://spam.com"') 200
Send-Test "not json" "submit-booking" "not json" 400