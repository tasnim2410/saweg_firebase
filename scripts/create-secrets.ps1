$gcloud = "C:\Users\tasni\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
$project = "saweg-f8c50"
$tmp = "$env:TEMP\gcloud-secret.txt"

function Create-Secret($name, $value) {
    Write-Host "Creating secret: $name"
    [System.IO.File]::WriteAllText($tmp, $value, [System.Text.Encoding]::UTF8)
    & $gcloud secrets create $name --data-file=$tmp --project=$project 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        & $gcloud secrets versions add $name --data-file=$tmp --project=$project 2>&1 | Out-Null
    }
    Write-Host "  done"
}

# Firebase Client
Create-Secret "firebase-api-key" "AIzaSyDVhO1Ipob3uPFMqsYpsjrGjsfuONaC-70"

# Firebase Admin
Create-Secret "firebase-project-id" "saweg-f8c50"
Create-Secret "firebase-client-email" "firebase-adminsdk-fbsvc@saweg-f8c50.iam.gserviceaccount.com"

# Firebase Private Key
$privateKey = @"
-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCqpS+SwpaDiVWj
tSRjFSa6tMtO5VsHVvJIj0p+zTVgSlPF+l6P6vb2YySVtRpu9ilsauVj+fRacTbQ
fnldefv7yqCt4LxAlkuwUDtU4mCA3N/Fs2IOtlaDvJrh0WQrC3/ANFBxgpb47YFC
tYIjkurqhPDvCO8kCaODIGgtO1yqasHLywj+gDCCwNEjF3Y3N2tZwRuiBSyTYfxx
mrZYoN725SkXt7AbUmx6bi99NOoROdZqnB7AfBiimUErElgvibv4n+yAC3VaqAbF
2NYbEmcxTfU3cHlmWDGOsf2OWOJTpfY5lPLJ3sOzVnDavd3ShGruocn0eQoETSZH
Tq6swYPjAgMBAAECggEAI861xN4AJ2nSBqAkGoZ9sf/uCYgnKcsc3Az1XNZCtQnj
uk9nOFvdpqX3L1LpUQ9mcdGcgPYaSEApeGaRoQPP1G4YeWQHHKZtC3pKeO1nwqKW
ci3KDbxFOy+AcJI3qrCnBfX0S11TwLhVv2HHBR/3G275/66oP6+mGAXc1mD2eOvG
KwbTmTKvDG92fGwSFLn0Ue/KPm7eomtzcFI/sfesFTEEirxpo7Jgmp6NEmtGRqcT
tZGQHWR7TRr8VyWnKZZFRim2qibFkX5Zb0xYpoetZEbEtZBzt1Gv77NoWHmNF/fX
wdmfqJBne2iMYcsOSx69DeR3kFhK8SSfRcDzZF/8wQKBgQDYAUWSJoF6lZqTvfmA
ukYaH4gT5Poyc6375OMiQyjzgM6qjVusPLah19/6KezG5e9OgYJCITO2p0Kd+WKX
c27RF8V1T1rxfDCwVgnYwt0nbKsozqRzw5JHYk/lt2AG7sBE+ULq/HN98R+kSVgv
2+S8y/9J9K6wyn88A1/bQsYijQKBgQDKPdgkfQjVN310bKofxH/3gLxzvcRK9ygz
27CUJ3//ebdMuuQMzY51D0kdCF3eCFfj2+XIFxSxekDeINIvjFkwV9zCLQOeq5w3
WwAiq7+Guy0hXTvXBuXyfL1h7nd8zJrwEMm8tD/vT9cLhOXmvL9l0jAGY0YxI3lR
kwHd43DcLwKBgQCMY8823UX8SW3NJoUacHcNlX7ZB1LCJcNn22zwoNvl38ryuKtj
d5Zv/CG7szIMV/fAe5YQqwm0ZmN6z1KQAtt8lMmmpCwEleYDRfhiZMxeSle4Tw49
m1fgg3pQYG3OM7DNY4BlwCzEJ0qceXsSqAWz25aSF7DOgN5PQBY2KOEkJQKBgHrV
tzrqSnweOO+GtImY8tRj95Ig12Fk3qEotQY3O5Hy3ncXKD3yd6z3vMOKemDKFn/J
5rVx91qYU1/W9XJ1vxISu32gk4tC1h31Ao8MW8a8VvvlwdunT/DI/MnHagF90Dkx
KSaZIB/9ETLo5C4Rw/pXAF5Q26gq0JvQOxkG9Fx3AoGBAMuGW0DklVKPXHRdnfxo
wx02nAzTdHJktjXGCEBs+r8EUrzO3evoQzFzeHaUEgqjtqF0pFhf6+xRNoaqgyWB
t3HH1jytrRP/PFJxCU0rsFXmOdK82/2hK/PL5u+319z94kwGah6nuTIqS9o1O/LP
7e2Z5v6FzmysWmWxNBYHpNpr
-----END PRIVATE KEY-----
"@
Create-Secret "firebase-private-key" $privateKey

# Database URL (Cloud SQL socket)
Create-Secret "database-url" "postgresql://saweg:Saweg*2026@/saweg?host=/cloudsql/saweg-f8c50:africa-south1:saweg-db"

# Resend
Create-Secret "resend-api-key" "re_iEWG5FN3_AsauZM8KjTFYsMu4oseGRW2M"
Create-Secret "resend-from-email" "no-reply@saweg.app"

# Contact
Create-Secret "contact-to-email" "tasnim.nefzi20@gmail.com"

# Admin
Create-Secret "admin-identifiers" "tasnim.nefzi@esprit.tn,94660390,riath.hmidi@gmail.com"

# VAPID
Create-Secret "vapid-public-key" "BL1B9k4lAD8cxBl-tRQq9vciPqxgEK19gxO9M70nyTrXHX-tSh7zPWd-lNGGn4Xx_MoaLxdeyMAARQI0DSlcwS0"
Create-Secret "vapid-private-key" "bfemHqP2jjkdjsH_j-tbzrZznaKO0M34hLGOWSVqhpE"
Create-Secret "vapid-email" "tasnim.nefzi20@gmail.com"

Remove-Item $tmp -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "All secrets created!"
