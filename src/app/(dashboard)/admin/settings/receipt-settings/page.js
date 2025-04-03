"use client"
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReloadIcon } from "@radix-ui/react-icons";

const ReceiptSettingsPage = () => {
  const [receiptWidth, setReceiptWidth] = useState('58');
  const [headerFontSize, setHeaderFontSize] = useState('14');
  const [subHeaderFontSize, setSubHeaderFontSize] = useState('12');
  const [bodyFontSize, setBodyFontSize] = useState('10');
  const [footerFontSize, setFooterFontSize] = useState('9');
  const [customFonts, setCustomFonts] = useState([]);
  const [newFontName, setNewFontName] = useState('');
  const [newFontFile, setNewFontFile] = useState(null);
  const [saveStatus, setSaveStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Load existing settings from localStorage
    const savedReceiptWidth = localStorage.getItem('receiptWidth');
    const savedHeaderFont = localStorage.getItem('headerFontSize');
    const savedSubHeaderFont = localStorage.getItem('subHeaderFontSize');
    const savedBodyFont = localStorage.getItem('bodyFontSize');
    const savedFooterFont = localStorage.getItem('footerFontSize');
    const savedCustomFonts = localStorage.getItem('customFonts');

    if (savedReceiptWidth) setReceiptWidth(savedReceiptWidth);
    if (savedHeaderFont) setHeaderFontSize(savedHeaderFont);
    if (savedSubHeaderFont) setSubHeaderFontSize(savedSubHeaderFont);
    if (savedBodyFont) setBodyFontSize(savedBodyFont);
    if (savedFooterFont) setFooterFontSize(savedFooterFont);
    if (savedCustomFonts) setCustomFonts(JSON.parse(savedCustomFonts));
  }, []);

  const handleSave = () => {
    setIsLoading(true);
    try {
      // Save all settings to localStorage
      localStorage.setItem('receiptWidth', receiptWidth);
      localStorage.setItem('headerFontSize', headerFontSize);
      localStorage.setItem('subHeaderFontSize', subHeaderFontSize);
      localStorage.setItem('bodyFontSize', bodyFontSize);
      localStorage.setItem('footerFontSize', footerFontSize);
      localStorage.setItem('customFonts', JSON.stringify(customFonts));
      
      // Show success message
      setSaveStatus({ type: 'success', message: 'Settings saved successfully!' });
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      setSaveStatus({ type: 'error', message: 'Error saving settings: ' + error.message });
      setTimeout(() => setSaveStatus(''), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setReceiptWidth('58');
    setHeaderFontSize('14');
    setSubHeaderFontSize('12');
    setBodyFontSize('10');
    setFooterFontSize('9');
  };

  const handleAddFont = (e) => {
    e.preventDefault();
    if (!newFontName.trim() || !newFontFile) {
      setSaveStatus({ type: 'error', message: 'Please provide both font name and file' });
      setTimeout(() => setSaveStatus(''), 3000);
      return;
    }

    // In a real implementation, you'd handle the file upload to a server or storage
    // Here we're just simulating it for the localStorage implementation
    const reader = new FileReader();
    reader.onload = (event) => {
      const newFont = {
        id: Date.now().toString(),
        name: newFontName,
        url: URL.createObjectURL(newFontFile), // This creates a temporary object URL
        dateAdded: new Date().toISOString()
      };
      
      const updatedFonts = [...customFonts, newFont];
      setCustomFonts(updatedFonts);
      localStorage.setItem('customFonts', JSON.stringify(updatedFonts));
      
      // Clear form
      setNewFontName('');
      setNewFontFile(null);
      
      setSaveStatus({ type: 'success', message: 'New font added successfully!' });
      setTimeout(() => setSaveStatus(''), 3000);
    };
    
    reader.readAsDataURL(newFontFile);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setNewFontFile(e.target.files[0]);
    }
  };

  const removeFont = (fontId) => {
    const updatedFonts = customFonts.filter(font => font.id !== fontId);
    setCustomFonts(updatedFonts);
    localStorage.setItem('customFonts', JSON.stringify(updatedFonts));
    
    setSaveStatus({ type: 'success', message: 'Font removed successfully!' });
    setTimeout(() => setSaveStatus(''), 3000);
  };
  

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Receipt Configuration</CardTitle>
          <CardDescription>Customize your receipt printing settings</CardDescription>
        </CardHeader>
        <CardContent>
          {saveStatus && (
            <Alert variant={saveStatus.type === 'error' ? "destructive" : "default"} className="mb-6">
              <AlertTitle>{saveStatus.type === 'error' ? "Error" : "Success"}</AlertTitle>
              <AlertDescription>{saveStatus.message}</AlertDescription>
            </Alert>
          )}
          
          <Tabs defaultValue="dimensions">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="dimensions">Dimensions & Font Sizes</TabsTrigger>
              <TabsTrigger value="fonts">Custom Fonts</TabsTrigger>
            </TabsList>
            
            <TabsContent value="dimensions" className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="receiptWidth" className="text-base">Receipt Width (mm)</Label>
                  <div className="flex items-center gap-4 mt-2">
                    <Slider 
                      id="receiptWidth"
                      value={[parseInt(receiptWidth)]} 
                      min={30} 
                      max={120}
                      step={1}
                      onValueChange={(value) => setReceiptWidth(value[0].toString())}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={receiptWidth}
                      onChange={(e) => setReceiptWidth(e.target.value)}
                      className="w-20"
                      min="30"
                      max="120"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Standard thermal receipt width is 58mm or 80mm</p>
                </div>
                
                <div className="pt-4">
                  <h3 className="text-lg font-medium mb-4">Font Sizes (pt)</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="headerFont">Header Font Size</Label>
                      <div className="flex items-center gap-4">
                        <Slider 
                          id="headerFont"
                          value={[parseInt(headerFontSize)]} 
                          min={8} 
                          max={24}
                          step={1}
                          onValueChange={(value) => setHeaderFontSize(value[0].toString())}
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          value={headerFontSize}
                          onChange={(e) => setHeaderFontSize(e.target.value)}
                          className="w-16"
                          min="8"
                          max="24"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="subHeaderFont">Sub-Header Font Size</Label>
                      <div className="flex items-center gap-4">
                        <Slider 
                          id="subHeaderFont"
                          value={[parseInt(subHeaderFontSize)]} 
                          min={7} 
                          max={20}
                          step={1}
                          onValueChange={(value) => setSubHeaderFontSize(value[0].toString())}
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          value={subHeaderFontSize}
                          onChange={(e) => setSubHeaderFontSize(e.target.value)}
                          className="w-16"
                          min="7"
                          max="20"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="bodyFont">Body Font Size</Label>
                      <div className="flex items-center gap-4">
                        <Slider 
                          id="bodyFont"
                          value={[parseInt(bodyFontSize)]} 
                          min={6} 
                          max={18}
                          step={1}
                          onValueChange={(value) => setBodyFontSize(value[0].toString())}
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          value={bodyFontSize}
                          onChange={(e) => setBodyFontSize(e.target.value)}
                          className="w-16"
                          min="6"
                          max="18"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="footerFont">Footer Font Size</Label>
                      <div className="flex items-center gap-4">
                        <Slider 
                          id="footerFont"
                          value={[parseInt(footerFontSize)]} 
                          min={6} 
                          max={16}
                          step={1}
                          onValueChange={(value) => setFooterFontSize(value[0].toString())}
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          value={footerFontSize}
                          onChange={(e) => setFooterFontSize(e.target.value)}
                          className="w-16"
                          min="6"
                          max="16"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="fonts" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Add Custom Font</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddFont} className="space-y-4">
                    <div>
                      <Label htmlFor="fontName">Font Name</Label>
                      <Input
                        id="fontName"
                        placeholder="Display name for this font"
                        value={newFontName}
                        onChange={(e) => setNewFontName(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="fontFile">Font File</Label>
                      <Input
                        id="fontFile"
                        type="file"
                        accept=".ttf,.otf,.woff,.woff2"
                        onChange={handleFileChange}
                        className="mt-1"
                      />
                      <p className="text-sm text-muted-foreground mt-1">Accepted formats: TTF, OTF, WOFF, WOFF2</p>
                    </div>
                    
                    <Button type="submit">Add Font</Button>
                  </form>
                </CardContent>
              </Card>
              
              {customFonts.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Your Custom Fonts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {customFonts.map(font => (
                        <div key={font.id} className="flex items-center justify-between p-3 border rounded">
                          <div>
                            <p className="font-medium">{font.name}</p>
                            <p className="text-sm text-muted-foreground">Added on {new Date(font.dateAdded).toLocaleDateString()}</p>
                          </div>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => removeFont(font.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center p-8 border border-dashed rounded-lg">
                  <p className="text-muted-foreground">No custom fonts added yet</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
          
          <div className="flex items-center gap-4 mt-8">
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading && <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />}
              Save Settings
            </Button>
            
            <Button variant="outline" onClick={handleReset}>
              Reset to Default
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReceiptSettingsPage;