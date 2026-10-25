Add-Type -AssemblyName System.Drawing

$width = 1200
$height = 630
$bmp = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gfx = [System.Drawing.Graphics]::FromImage($bmp)
$gfx.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$gfx.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$gfx.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

# Background: Swiss Alabaster #FBFBF9
$bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#FBFBF9'))
$gfx.FillRectangle($bgBrush, 0, 0, $width, $height)

# Top Emerald Accent Line #059669
$emeraldBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#059669'))
$gfx.FillRectangle($emeraldBrush, 0, 0, $width, 8)

# Logo Mark Box (Emerald 70x70)
$gfx.FillRectangle($emeraldBrush, 80, 70, 70, 70)
$logoFont = New-Object System.Drawing.Font('Arial', 40, [System.Drawing.FontStyle]::Bold)
$whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$gfx.DrawString('B', $logoFont, $whiteBrush, 96, 75)

# Brand Title
$brandFont = New-Object System.Drawing.Font('Arial', 24, [System.Drawing.FontStyle]::Bold)
$slateDarkBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#0F172A'))
$gfx.DrawString('BUDOF', $brandFont, $slateDarkBrush, 170, 72)

# Tagline
$subFont = New-Object System.Drawing.Font('Arial', 14, [System.Drawing.FontStyle]::Regular)
$slateMutedBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#64748B'))
$gfx.DrawString('FINTECH SUITE — OPERATIONAL FINANCE FOR STARTUPS', $subFont, $slateMutedBrush, 170, 110)

# Main Title
$titleFont = New-Object System.Drawing.Font('Arial', 38, [System.Drawing.FontStyle]::Bold)
$gfx.DrawString('Startup Runway, SaaS Unit Economics & Tycoon Simulator', $titleFont, $slateDarkBrush, 80, 180)

# Subtitle
$descFont = New-Object System.Drawing.Font('Arial', 18, [System.Drawing.FontStyle]::Regular)
$gfx.DrawString('Model 36-month burn, Default Alive status, LTV:CAC, cap table dilution, and play the 24-month game.', $descFont, $slateMutedBrush, 80, 240)

# 4 Cards Layout
$cardWidth = 245
$cardHeight = 190
$cardY = 310
$cardBgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$cardBorderPen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml('#E2E8F0'), 2)
$cardTitleFont = New-Object System.Drawing.Font('Arial', 15, [System.Drawing.FontStyle]::Bold)
$cardBodyFont = New-Object System.Drawing.Font('Arial', 12, [System.Drawing.FontStyle]::Regular)
$cardMetricFont = New-Object System.Drawing.Font('Arial', 20, [System.Drawing.FontStyle]::Bold)

$cards = @(
  @{ Title = 'Runway Forecaster'; Metric = '36-Month'; Desc = 'Dynamic burn model, hiring roadmap & Default Alive status.'; X = 80 },
  @{ Title = 'SaaS Unit Economics'; Metric = 'CAC : LTV'; Desc = 'Payback period, Magic Number & Rule of 40 scoring.'; X = 350 },
  @{ Title = 'Fundraising & Dilution'; Metric = 'Cap Table'; Desc = 'Target round sizing, option pools & hiring impact.'; X = 620 },
  @{ Title = 'Startup Tycoon Game'; Metric = '24-Month'; Desc = 'Turn-based simulation: hire, burn, pivot & pitch VCs.'; X = 890 }
)

foreach ($c in $cards) {
  $gfx.FillRectangle($cardBgBrush, $c.X, $cardY, $cardWidth, $cardHeight)
  $gfx.DrawRectangle($cardBorderPen, $c.X, $cardY, $cardWidth, $cardHeight)
  $gfx.DrawString($c.Title, $cardTitleFont, $slateDarkBrush, ($c.X + 16), ($cardY + 18))
  $gfx.DrawString($c.Metric, $cardMetricFont, $emeraldBrush, ($c.X + 16), ($cardY + 48))
  
  $rect = New-Object System.Drawing.RectangleF(($c.X + 16), ($cardY + 95), ($cardWidth - 32), 80)
  $gfx.DrawString($c.Desc, $cardBodyFont, $slateMutedBrush, $rect)
}

# Footer Bar
$footerFont = New-Object System.Drawing.Font('Arial', 13, [System.Drawing.FontStyle]::Bold)
$gfx.DrawString('100% In-Browser • Zero Dependencies • Open-Source Financial Tools at budof.com', $footerFont, $slateMutedBrush, 80, 560)

# Save Bitmap
$outputPath = 'C:\Users\lucky\dev-npm\budof\og-image.png'
$bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

$gfx.Dispose()
$bmp.Dispose()
Write-Output "Successfully generated $outputPath"
