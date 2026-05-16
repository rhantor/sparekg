Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead('c:\workspace\personal project\sparekg\spare_kg_Blueprint.docx')
$entry = $zip.Entries | Where-Object { $_.FullName -eq 'word/document.xml' }
$stream = $entry.Open()
$reader = New-Object System.IO.StreamReader($stream)
$xml = [xml]$reader.ReadToEnd()
$reader.Close()
$stream.Close()
$zip.Dispose()
$ns = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
$ns.AddNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main')
$paragraphs = $xml.SelectNodes('//w:p', $ns)
$text = ''
foreach ($p in $paragraphs) {
    $runs = $p.SelectNodes('.//w:t', $ns)
    $line = ''
    foreach ($r in $runs) { $line += $r.InnerText }
    $text += $line + "`r`n"
}
$text | Out-File -FilePath 'c:\workspace\personal project\sparekg\blueprint_text.txt' -Encoding UTF8
