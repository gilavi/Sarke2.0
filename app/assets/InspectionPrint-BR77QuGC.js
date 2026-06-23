import{aq as G,ah as Q,H as K,r as z,Z as j,k as P}from"./vendor-CYDr5Dmg.js";import{p as V,r as M,au as Y,av as Z,aw as J,j as ee,ax as te,ay as ae,az as oe}from"./index-Ck9VVbgr.js";import"./rnw-397lLdAQ.js";import"./threejs-DMSMP7nr.js";import"./supabase-Br1050JR.js";import"./icons-CbzK9Jh6.js";import"./leaflet-BZadi80u.js";const ie={save:"შენახვა",cancel:"გაუქმება",delete:"წაშლა",edit:"რედაქტირება",add:"დამატება",create:"შექმნა",close:"დახურვა",back:"უკან",done:"დასრულება",next:"შემდეგი",skip:"გამოტოვება",continue:"გაგრძელება",confirm:"დადასტურება",send:"გაგზავნა",resend:"ხელახლა გაგზავნა",remove:"წაშლა",yes:"კი",no:"არა",ok:"კარგი",localeTag:"ka-GE",loading:"იტვირთება…",retry:"ხელახლა ცდა",search:"ძიება",empty:"ცარიელია",draft:"დრაფტი",completed:"დასრულდა",required:"სავალდებულო",optional:"სურვილის შემთხვევაში",all:"ყველა",new:"ახალი",project:"პროექტი",inspection:"შემოწმების აქტი",certificate:"სერტიფიკატი",qualification:"სერტიფიკატები",signature:"ხელმოწერა",signer:"ხელმომწერი",status:"სტატუსი",date:"თარიღი",name:"სახელი",company:"კომპანია",address:"მისამართი",phone:"ტელეფონი",position:"პოზიცია",role:"როლი",email:"ელ-ფოსტა",password:"პაროლი",help:"დახმარება",error:"შეცდომა",viewAction:"ნახვა",areYouSure:"დარწმუნებული ხართ?"},ne={close:"დახურვა",closeHint:"შეეხეთ დასახურად",addPhoto:"ფოტოს დამატება",addPhotoHint:"შეეხეთ ახალი ფოტოს ასატვირთად",viewPhoto:"ფოტოს ნახვა",viewPhotoHint:"შეეხეთ ფოტოს დიდად სანახავად",deleteSigner:"მონაწილის წაშლა",deleteSignerHint:"ამ მონაწილის წაშლა",deleteMember:"წაშლა",deleteMemberHint:"მონაწილის წაშლა",addMember:"დამატება",addMemberHint:"ახალი მონაწილის დამატება",saveSignature:"შენახვა",saveSignatureHint:"ხელმოწერის შენახვა",clearSignature:"გასუფთავება",clearSignatureHint:"ხელმოწერის გასუფთავება",selectRole:"აირჩიეთ როლი",selectTemplate:"აირჩიეთ შაბლონი",backToInspection:"შემოწმების აქტი — დაბრუნება",backToInspectionHint:"გადავა შემოწმების აქტის ეკრანზე",retryLoading:"ხელახლა ცდა",cancelHint:"შეეხეთ გასაუქმებლად",newCertificate:"ახალი სერტიფიკატი",newCertificateHint:"სერტიფიკატის დამატება",closeSheet:"დახურვა",closeSheetHint:"ფორმის დახურვა",closePreview:"დახურვა",closePreviewHint:"პრევიუს დახურვა",help:"დახმარება",navigate:"გადასვლა",resumeDraft:"შევსების გაგრძელება"},re={searching:"ვეძებ მისამართს…",notFound:"მისამართი რუკაზე ვერ მოიძებნა"},se={unknown:"უცნობი შეცდომა",invalidEmailOrPassword:"არასწორი ელ-ფოსტა ან პაროლი",confirmEmailFirst:"გთხოვთ, დაადასტუროთ ელ-ფოსტა, შემდეგ სცადეთ შესვლა",passwordTooShort:"პაროლი უნდა შეიცავდეს მინიმუმ {{min}} სიმბოლოს",tooManyAttempts:"ძალიან ბევრი მცდელობა. მოიცადეთ და კვლავ სცადეთ",network:"ქსელის შეცდომა. შეამოწმეთ ინტერნეტ კავშირი",operationCancelled:"ოპერაცია გაუქმდა",notFound:"მონაცემი ვერ მოიძებნა",forbidden:"წვდომა აკრძალულია",alreadyExists:"უკვე არსებობს",requiredField:"სავალდებულო ველი",invalidPhoneFormat:"ფორმატი: +995 5XX XXX XXX ან 32X XXX XXX",deleteFailed:"წაშლა ვერ მოხერხდა",createFailed:"შექმნა ვერ მოხერხდა",saveFailed:"შენახვა ვერ მოხერხდა",uploadFailed:"ატვირთვა ვერ მოხერხდა",generationFailed:"გენერაცია ვერ მოხერხდა",syncFailed:"სინქრონიზაცია ვერ მოხერხდა",loadFailed:"ჩატვირთვა ვერ მოხერხდა",previewFailed:"პრევიუს ჩატვირთვა ვერ მოხერხდა",invalidAnswerFormat:"პასუხის ფორმატი არასწორია. გთხოვთ, შეასწოროთ.",needsInternetForPhoto:"ფოტოს ასატვირთად საჭიროა ინტერნეტი",cameraPermission:"კამერაზე წვდომა საჭიროა",galleryPermission:"გალერეაზე წვდომა საჭიროა",authRequired:"ავტორიზაცია საჭიროა",photoPermission:"ფოტოზე წვდომა არ არის",notFoundInspection:"შემოწმების აქტი ვერ მოიძებნა",notFoundTemplate:"შაბლონი არ არის",notFoundProject:"პროექტი ვერ მოიძებნა",missingQualification:"აკლია სერტიფიკატები",missingQualificationDesc:"მიუთითეთ: {{types}}",signatureRequired:"ხელმოწერა საჭიროა",signatureRequiredDesc:"PDF-ის დასაგენერირებლად საჭიროა ექსპერტის ხელმოწერა.",missingFields:"შეავსეთ: {{fields}}",pdfNotGeneratedYet:"ჯერ დააგენერირე PDF რეპორტი",inspectionNotSpecified:"შემოწმების აქტი არ არის მითითებული",dataStillLoading:"მონაცემები ჯერ იტვირთება",googleCalendarNotConnected:"ჯერ მიაერთეთ Google კალენდარი",googleSessionExpired:"Google სესია ამოიწურა — შეაერთე თავიდან",googleCalendarDisconnected:"Google კალენდარი გაითიშა",googleCalendarConnected:"Google კალენდარი შეერთდა",imageReadFailed:"სურათის წაკითხვა ვერ მოხერხდა",pdfFailed:"PDF ვერ შეიქმნა",navFailed:"ნავიგაცია ვერ მოხერხდა",photoSavingPending:"ფოტო ატვირთვა მიმდინარეობს. გთხოვთ მოიცადოთ და სცადოთ თავიდან",inspectionCreateFailed:"შემოწმების აქტი ვერ შეიქმნა"},le={channelName:"შემოწმების აქტის შეხსენება",fallbackItemName:"შემოწმების აქტი",expiringTomorrowTitle:"ვადა გასდის ხვალ",addedToCalendar:"დაემატა: {{count}}",smsSent:"SMS გაიგზავნა",smsResent:"SMS ხელახლა გაიგზავნა",pdfDeleted:"PDF რეპორტი წაიშალა",requestDeleted:"მოთხოვნა წაიშალა",certificateUploaded:"სერტიფიკატი აიტვირთა",photoUploaded:"ფოტო აიტვირთა",photoDeleted:"ფოტო წაიშალა",signatureSaved:"ხელმოწერა შენახულია",projectCreated:"პროექტი შეიქმნა",undoLabel:"დაბრუნება",draftLoaded:"ჩატვირთულია ლოკალური ასლი — სინქრონიზაცია მოხდება ავტომატურად.",deleted:"წაიშალა",languageChanged:"ენა შეიცვალა",signedOut:"გასვლა შესრულდა",signOutFailed:"გასვლა ვერ მოხდა",photoSavedLocally:"ფოტო შენახულია — აიტვირთება ქსელის დაბრუნებისას",photoDeletedLocally:"ფოტო წაიშალა — სინქრონიზაცია მოხდება ქსელის დაბრუნებისას"},de={home:"მთავარი",homeA11y:"მთავარი გვერდი",projects:"პროექტები",projectsA11y:"პროექტების სია",calendar:"კალენდარი",calendarA11y:"კალენდარი — განრიგი",regulations:"რეგულაციები",regulationsA11y:"რეგულაციები და სტანდარტები",more:"მეტი",moreA11y:"დამატებითი მენიუ",backToHome:"მთავარ გვერდზე",backToMore:"მეტი"},ce={brand:"Hubble",tagline:"შრომის უსაფრთხოების ექსპერტი",login:"შესვლა",register:"რეგისტრაცია",loginWithGoogle:"Google-ით შესვლა",registerWithGoogle:"Google-ით რეგისტრაცია",forgotPassword:"პაროლი დაგავიწყდა?",resetPassword:"პაროლის აღდგენა",resetSent:`პაროლის განახლების ბმული გაიგზავნა
{{email}}-ზე.`,resetInstructions:"შეიყვანეთ ელ-ფოსტა და გამოგიგზავნებთ პაროლის განახლების ბმულს.",sendLink:"გაგზავნა",enterValidEmail:"გთხოვთ შეიყვანოთ ვალიდური ელ-ფოსტა",passwordMinLength:"პაროლი (მინ. {{min}} სიმბოლო)",emailPlaceholder:"you@example.com",firstName:"სახელი",lastName:"გვარი",firstNamePlaceholder:"გიორგი",lastNamePlaceholder:"ხელაძე",emailAlreadyInUse:"ესეთი უზერი არსებობს უკვე",emailAlreadyInUseDesc:"ამ ელ-ფოსტით ანგარიში უკვე არსებობს. გსურთ შესვლა?",passwordWrong:"პაროლი არასწორია",accountNotFound:"ანგარიში ვერ მოიძებნა — შეამოწმეთ ელ-ფოსტა",tooManyAttemptsTitle:"ბევრჯერ ცადეთ?",tooManyAttemptsBody:"შესაძლოა პაროლი დაგავიწყდათ. გსურთ აღდგენა?",resetCta:"პაროლის აღდგენა",or:"ან",linkSent:"ბმული გაიგზავნა",linkSentBody:"შეამოწმეთ {{email}}. ბმულზე დაჭერით დაბრუნდებით აპლიკაციაში ახალი პაროლის შესაყვანად.",resetTitle:"პაროლის აღდგენა",resetSubtitle:"შეიყვანეთ ელ-ფოსტა და გამოგიგზავნით ბმულს პაროლის შესაცვლელად.",checkEmail:"შეამოწმეთ ელ-ფოსტა",verifyCodeSent:"დადასტურების ბმული გაიგზავნა {{email}}-ზე. დააჭირეთ ბმულს ელ-ფოსტაში, ან შეიყვანეთ კოდი ქვემოთ.",verifyConfirm:"დადასტურება",didntReceiveCode:"კოდი არ მიგიღიათ?",resend:"ხელახლა გაგზავნა",resendIn:"ხელახლა გაგზავნა ({{n}}წ)",codeSent:"კოდი გამოგზავნილია",codeExpired:"კოდის ვადა ამოიწურა. მოითხოვეთ ახალი.",invalidCode:"არასწორი კოდი. გთხოვთ, სცადოთ კიდევ ერთხელ."},pe={greetingNight:"მოგესალმებით",greetingMorning:"დილა მშვიდობისა",greetingAfternoon:"გამარჯობა",greetingEvening:"საღამო მშვიდობისა",resumeDraft:"გააგრძელეთ დრაფტი",newInspection:"ახალი შემოწმების აქტი",chooseProjectStart:"აირჩიეთ პროექტი და დაიწყეთ",uploadCertificates:"ატვირთეთ სერტიფიკატები",certExpiring:"{{count}} სერტიფიკატი იწურება",certExpiringSuffix:"სერტიფიკატი იწურება",pdfIncluded:"PDF რეპორტს ავტომატურად ერთვის.",checkDeadlines:"შეამოწმეთ ვადები, სანამ ობიექტი არ გაჩერდება.",sectionProjects:"პროექტები",allProjects:"ყველა",newProject:"ახალი პროექტი",createFirst:"შექმენით პირველი",recentActivity:"ბოლო აქტივობა",recentActs:"ბოლო აქტები",fetchError:"მონაცემები ვერ ჩაიტვირთა — შეამოწმეთ კავშირი და ჩამოათრიეთ განახლებისთვის",allActivity:"ყველა",startInspectionSheetTitle:"შემოწმების აქტის დაწყება",addNewProjectSheet:"ახალი პროექტის დამატება",noProjectsYet:"პროექტი ჯერ არ გაქვს",noProjectsHint:'შეეხეთ "ახალი პროექტის დამატება"',chooseTemplate:"აირჩიეთ შაბლონი",newProjectFormTitle:"ახალი პროექტი",projectNamePlaceholder:"მაგ. ვაკე-საბურთალოს ობიექტი",companyPlaceholder:"შემკვეთი",tipOfDay:"რჩევა დღისთვის",tip1:"ხარაჩოს ინსპექტირებამდე დარწმუნდით, რომ ქამარი და მუზარადი გაქვთ.",tip2:"ქარი 15 მ/წმ-ზე მეტი — შეაჩერეთ სიმაღლის სამუშაოები.",tip3:"ქამრის შემოწმების აქტი: შეამოწმეთ ნაკერები და ბალთები, არა მხოლოდ ზოლი.",tip4:"ფოტოები რეპორტს 3-ჯერ უფრო სანდოს ხდის — გადაიღეთ ყოველი ცვლილება.",tip5:"ხარაჩოს ფეხები უნდა იდგას მტკიცე, თანაბარ ზედაპირზე.",tip6:"ორი დამოუკიდებელი მიბმის წერტილი ყოველთვის უფრო უსაფრთხოა, ვიდრე ერთი.",tip7:"სველი ხარაჩო ორჯერ უფრო საშიშია — შეამოწმეთ ფიცრის ლპობა.",relNow:"ახლა",relMinAgo:"{{n}} წთ. წინ",relHourAgo:"{{n}} სთ. წინ",relDayAgo:"{{n}} დღის წინ",quickInspection:"შემოწმება",quickIncident:"ინციდენტი",quickBriefing:"ინსტრუქტაჟი",quickReport:"რეპორტი",newLabel:"ახალი",stepLabel:"ნაბიჯი {{step}}"},ue={title:"პროექტები",yourProjects:"შენი პროექტები",subtitle:"აქ ჩანს თქვენი ყველა მიმდინარე პროექტი",tapForDetails:"შეეხეთ პროექტს დეტალების სანახავად",addProject:"ახალი პროექტი",addProjectSubtitle:"დაამატე სამშენებლო ობიექტი შემოწმების დასაწყებად",yourProfile:"შენი პროფილი",profileSubtitle:"აქ არის შენი ხელმოწერა და პარამეტრები",noProjects:"ჯერ პროექტი არ არის",noProjectsHint:"შექმენით პირველი პროექტი და დაიწყეთ შემოწმების აქტები",createProject:"+ ახალი პროექტი",changePhoto:"სურათის შეცვლა",createButton:"შექმნა",clientPlaceholder:"შემკვეთი",projectNamePlaceholder:"მაგ. ვაკე-საბურთალოს ობიექტი",nameLabel:"სახელი",companyLabel:"კომპანია",addressLabel:"მისამართი",deleteConfirm:"{{name}} — ყველა შემოწმების აქტსთან ერთად წაიშლება. გავაგრძელოთ?",draft:"დრაფტი",completed:"დასრულდა",tourProjectInfo:"პროექტის ბარათი",tourProjectInfoBody:"დასახელება, მისამართი, ლოგო და მდებარეობა. შესაცვლელად დააჭირეთ ფანქრის ღილაკს ზედა მარჯვნივ.",tourActions:"სწრაფი ქმედებები",tourActionsBody:"ერთი შეხებით დაიწყეთ შემოწმება, დაარეგისტრირეთ ინციდენტი, ჩაატარეთ ინსტრუქტაჟი, შექმენით რეპორტი ან დაამატეთ ფაილი.",tourCrew:"გუნდი",tourCrewBody:"დაამატეთ ინსპექტორი და მუშები — ისინი ავტომატურად აისახებიან შემოწმების აქტებში.",tourFiles:"ბრძანებები",tourFilesBody:"აქ იქმნება ბრძანებები და ინახება ფაილები",tourHistory:"ჩანაწერების ისტორია",tourHistoryBody:"ყველა შემოწმება, ინციდენტი, ინსტრუქტაჟი და დოკუმენტი ინახება სექციებად ქვემოთ.",tourNewInspection:"ახალი შემოწმების აქტი",tourNewInspectionBody:"დააჭირეთ და დაიწყეთ ახალი შემოწმების აქტი",inspectorFallback:"ინსპექტორი",memberSaveError:"მონაწილე ვერ შეინახა",templateMissing:"შაბლონი არ არის",chooseTemplateTitle:"აირჩიეთ შაბლონი",cancelOption:"გაუქმება",noCompletedInspections:"ჯერ არ არის დასრულებული",logoUpdated:"ლოგო განახლდა",logoSaveFailed:"ლოგო ვერ შეინახა",logoRemove:"ლოგოს წაშლა",galleryAccessDenied:"გალერეაზე წვდომა აკრძალულია",uploaded:"აიტვირთა",fileOpenFailed:"ფაილი ვერ გაიხსნა",saved:"შენახულია",draftsSection:"დრაფტები",completedSection:"დასრულებული",questionnairesSection:"შემოწმების აქტები",participantsSection:"მონაწილეები",edit:"რედაქტირება",contactPhone:"საკონტაქტო ტელეფონი",chooseLocation:"მდებარეობის არჩევა",chooseOnMap:"აირჩიეთ მდებარეობა რუკაზე",noLocation:"ლოკაციის გარეშე",unmappedCount:"{{count}} პროექტს ლოკაცია არ აქვს",overdueCount:"⚠ {{count}} ვადაგადაცილებული",draftsCountBadge:"✎ {{count}} დრაფტი",completedCountBadge:"✓ {{count}} დასრულებული",noInspections:"შემოწმება არ არის",openButton:"გახსნა →",deleteConfirmYes:"დიახ, წაშლა",fabA11yLabel:"ახალი პროექტი",fabA11yHint:"შეეხეთ ახალი პროექტის შესაქმნელად",mapPickError:"აირჩიეთ მდებარეობა რუკაზე",unmappedSheetSubtitle:"ამ პროექტებს კოორდინატები არ აქვთ",changePhotoHint:"შეეხეთ ლოგოს ასარჩევად",closeBackdrop:"შეეხეთ ფონის დასახურად",openProject:"გახსნა →"},ge={newTitle:"ახალი მონაწილე",editTitle:"მონაწილის რედაქტირება",fullNamePlaceholder:"გიორგი ხელაძე",phonePlaceholder:"+995 5XX XX XX XX",positionPlaceholder:"მაგ. ზედამხედველი",noSignature:"ხელმოწერა შენახული არ არის",drawSignature:"ხელმოწერის დახატვა",redrawSignature:"ხელახლა დახატვა",signatureField:"ხელმოწერა",addButton:"დამატება",saveButton:"შენახვა",clearButton:"გასუფთავება",added:"დაემატა",updated:"განახლდა"},me={title:"შემოწმების აქტი",backTitle:"მთავარი",notFoundTitle:"შემოწმების აქტი ვერ მოიძებნა",notFoundDesc:"შესაძლოა წაიშალა, ან თქვენ არ გაქვთ წვდომა.",statusSafe:"✓ უსაფრთხოა",statusProblems:"⚠ გამოვლენილია პრობლემები",problemsSection:"გამოვლენილი პრობლემები",checked:"შემოწმდა",problem:"პრობლემა",skipped:"გამოტოვდა",participants:"მონაწილეები",signed:"ხელი მოწერილი",notPresent:"არ ესწრებოდა",pdfGenerateAndSend:"PDF გენერირება და გაგზავნა",pdfPreview:"PDF პრევიუ",pdfReportsCount:"PDF რეპორტები ({{count}})",previewModalTitle:"PDF პრევიუ",previewLoading:"პრევიუ იტვირთება…",safe:"უსაფრთხოა",caution:"დასაშვებია, საჭიროებს დაკვირვებას",notSafe:"დაუშვებელია გამოყენება",remoteNotSent:"არ გაგზავნილა",remoteSent:"გაგზავნილია",remoteSigned:"ხელმოწერილი",remoteDeclined:"უარი თქვა",remoteExpired:"ვადაგასული",sendSms:"SMS-ის გაგზავნა",resendSms:"ხელახლა გაგზავნა",cancelRemote:"გაუქმება",wizardStepConclusion:"დასკვნა",wizardStepHarnessCount:"ქამარების რაოდენობა",wizardStepHarnessCheck:"ქამარების შემოწმება",wizardStepComponent:"კომპონენტი • {{row}}",wizardStepCheck:"შემოწმება",wizardStepMeasure:"გაზომვა",wizardStepNote:"შენიშვნა",wizardStepPhoto:"ფოტო",loadError:"არ მოიძებნა",answerFormatError:"პასუხის ფორმატი არასწორია. გთხოვთ, შეასწოროთ.",loadErrorWithDetail:"ჩატვირთვა ვერ მოხერხდა: {{detail}}",photoUploading:"ფოტოები იტვირთება ({{count}})…",photoUploadingSingle:"ფოტო იტვირთება…",footerComplete:"დასრულება",footerNextAnswered:"შემდეგი",footerNextUnanswered:"გამოტოვება",deleteTitle:"წაშლა?",deleteBody:"შემოწმების აქტი სამუდამოდ წაიშლება.",deleteCancel:"გაუქმება",deleteConfirm:"წაშლა",photoLabel:"ფოტო",noteLabel:"შენიშვნა",textPlaceholder:"შეავსეთ აქ...",missingSafetyStatus:"უსაფრთხოების სტატუსი",missingConclusion:"დასკვნა",missingHarnessName:"ქამრის დასახელება",completeError:"შემოწმების აქტის დასრულება ვერ მოხერხდა: {{detail}}",exitTitle:"გასვლა?",exitBody:"გასვლისას პასუხები შეინახება, მაგრამ შემოწმების აქტი არ დასრულდება.",exitStay:"გაგრძელება",exitLeave:"გასვლა",commentPlaceholder:"კომენტარი",additionalCommentPlaceholder:"დამატებითი კომენტარი (არასავალდებულო)",harnessModelPlaceholder:"მაგ. Petzl NEWTON",describeDetailedPlaceholder:"აღწერეთ დეტალურად...",viewPreview:"პრევიუს ნახვა",viewInspection:"შემოწმების აქტის ნახვა",backToHome:"მთავარ გვერდზე",deletePhotoTitle:"ფოტოს წაშლა",deletePhotoBody:"დარწმუნებული ხართ, რომ გსურთ ამ ფოტოს წაშლა?",requiredFields:"შეავსეთ სავალდებულო ველები",newModalTitle:"ახალი შემოწმების აქტი",templateLabel:"შაბლონი",chooseProject:"აირჩიეთ პროექტი",createNow:"შექმნი ახლავე",noProjectsYet2:`ჯერ არცერთი პროექტი არ გაქვს.
დაიწყე ახლის შექმნით.`,startButton:"დაიწყე შემოწმების აქტი",chooseProjectRequired:"აირჩიეთ პროექტი",completeSuccess:"შემოწმება დასრულდა",answerSaveFailed:"პასუხი ვერ შეინახა: {{detail}}",photoUploadFailed:"ფოტო ვერ აიტვირთა: {{detail}}",photoDeleteFailed:"ფოტო ვერ წაიშალა: {{detail}}",loadTimeout:"შემოწმების მონაცემების ჩატვირთვა ძალიან დიდხანს გრძელდება. სცადეთ თავიდან ან გადადით უკან.",retryLoad:"თავიდან ცდა"},fe={title:"PDF რეპორტები",emptyTitle:"PDF რეპორტი ჯერ არ გაქვთ",emptyHint:"დაასრულეთ შემოწმების აქტი და დააგენერირეთ პირველი PDF რეპორტი",emptyAction:"ახალი შემოწმების აქტი",pdfReport:"PDF რეპორტი",deleted:"წაიშალა",deleteError:"ვერ წაიშალა",newTitle:"PDF რეპორტის გენერაცია",qualificationMissingTitle:"სერტიფიკატები არ არის",qualificationMissingDesc:"ატვირთეთ სერტიფიკატი ან ახლავე ატვირთეთ ახალი.",uploadAction:"ატვირთვა",noOtherQualifications:"სხვა სერტიფიკატები არ არის",inspectionLabel:"შემოწმების აქტი",chiefEngineer:"მთავარი ინჟინერი",safetySpecialist:"შრომის უსაფრთხოების სპეციალისტი",drawAction:"დახატვა",changeAction:"შეცვლა",signaturePlaceholder:"ხელმოწერა",otherSigners:"სხვა ხელმომწერები",signerSignatureOf:"{{name}}-ის ხელმოწერა",signatureRequired:"ხელმოწერა საჭიროა",addSignerOptional:"სურვილის შემთხვევაში — დაამატეთ სხვა ხელმომწერი",signerNamePlaceholder:"სახელი გვარი",enterNameFirst:"ჯერ შეიყვანეთ სახელი",newSigner:"ახალი ხელმომწერი",qualificationCerts:"სერტიფიკატები",notSelected:"არ არის არჩეული",uploaded:"ატვირთულია",certNumber:"№ {{number}}",changeCert:"შეცვლა",selectCert:"არჩევა",selectAllRequired:"არჩიე ყველა საჭირო სერტიფიკატი",additionalCerts:"დამატებითი სერტიფიკატები",addOtherQualifications:"სურვილის შემთხვევაში — დაამატეთ სხვა სერტიფიკატი",addButton:"+ დამატება",previewButton:"პრევიუ",generateButton:"PDF-ის გენერაცია",generateSuccess:"PDF რეპორტი შეიქმნა",assetsMissing:"{{count}} სურათი ვერ ჩაიდო — გამოჩნდება ჩანაცვლების ნიშნით.",previewFailedTitle:"პრევიუ ვერ აიწყო",sendSmsSuccess:"SMS გაიგზავნა",expertSignatureNeeded:'ექსპერტის ხელმოწერა საჭიროა — დაამატეთ "ჩემი ხელმოწერა" ეკრანიდან',addLogoTitle:"ლოგოს დამატება",addLogoBody:"პროექტს ჯერ არ აქვს ლოგო. გსურთ მისი დამატება PDF-ის გენერაციამდე?",addLogoAdd:"დამატება",logoSaveFailed:"ლოგო ვერ შეინახა",localCopyMissing:'ამ მოწყობილობაზე ლოკალური ასლი არ არის. დააჭირეთ "გაზიარება".'},he={title:"სერტიფიკატები",backTitle:"მეტი",requiredCerts:"სავალდებულო სერტიფიკატები",additionalCerts:"დამატებითი სერტიფიკატები",editTitle:"სერტიფიკატის რედაქტირება",newCertTitle:"ახალი სერტიფიკატი",typeRequired:"აირჩიე ან ჩაწერე სერტიფიკატის ტიპი",numberLabel:"ნომერი",deleteTitle:"წაიშალოს?",deleteBody:"სერტიფიკატის წაშლა შეუქცევადია",photoSelected:"✓ ფოტო არჩეულია — შეცვლა",changePhotoLabel:"ფოტოს შეცვლა",addCertPhoto:"სერტიფიკატის ფოტო",typeLabel:"ტიპი",issuedDate:"გაცემის თარიღი",expiryDate:"ვადის გასვლის თარიღი",expiryDateShort:"ვადის გასვლა",expiredLabel:"ვადა გასულია",expiringLabel:"იწურება",other:"სხვა",customCertRow:"სხვა ნებისმიერი სერტიფიკატი",uploadHint:"ატვირთვა",readyBtn:"მზადაა",yearPlus1:"+1 წელი",yearPlus3:"+3 წელი",yearPlus5:"+5 წელი",expiryQuickHint:"ვადის სწრაფად დამატება",certTypeInput:"სერტიფიკატის ტიპი",photoLabel16x9:"ფოტო (16:9)",photoUploadBtn:"ფოტოს ატვირთვა",selectTypeHint:"სერტიფიკატის ტიპის არჩევა",editHint:"სერტიფიკატის რედაქტირება",deleteHint:"სერტიფიკატის წაშლა"},be={title:"ისტორია",backTitle:"მეტი",draftsSection:"დრაფტები",completedSection:"დასრულებული",deleteTitle:"წაშლა?",deleteBody:"შემოწმების აქტი სამუდამოდ წაიშლება.",deleted:"წაიშალა",deleteError:"ვერ წაიშალა",inspectionA11y:"შემოწმების აქტი",viewCompleted:"დასრულებული შემოწმების აქტის ნახვა",resumeDraft:"დრაფტის გაგრძელება",emptyTitle:"ისტორია ცარიელია",emptyHint:"დასრულებული შემოწმების აქტები გამოჩნდება აქ",startInspection:"შემოწმების აქტის დაწყება"},ve={title:"მეტი",projectsCount:"პროექტი",completedCount:"დასრულდა",draftCount:"დრაფტი",history:"ისტორია",lastInspection:"ბოლო: {{date}}",emptyLast:"ცარიელია",qualifications:"სერტიფიკატები",expiringCount:"{{count}} იწურება",uploadPrompt:"დააჭირეთ ასატვირთად",allActive:"ყველა აქტიური",templates:"შაბლონები",system:"სისტემა",regulations:"რეგულაციები",document:"დოკუმენტი",mySignature:"ჩემი ხელმოწერა",drawSignature:"ხელმოწერის დახატვა",terms:"წესები და პირობები",signOut:"გასვლა",privacyPolicy:"კონფიდენციალურობის პოლიტიკა",privacyNoShare:"Hubble არ იზიარებს თქვენს პერსონალურ მონაცემებს მესამე მხარესთან.",privacyPhotos:"ფოტოები და ხელმოწერები ინახება მხოლოდ თქვენს პირად ანგარიშში",privacyPdf:"PDF რეპორტები ხელმისაწვდომია მხოლოდ თქვენთვის და თქვენი ორგანიზაციისთვის",privacyDelete:"მონაცემთა წაშლა შესაძლებელია აპლიკაციის პარამეტრებიდან",privacySupabase:"ყველა მონაცემი დაცულია Supabase-ის უსაფრთხო სერვერებზე",copyright:"© 2026 Hubble · ყველა უფლება დაცულია",settings:"პარამეტრები",darkMode:"მუქი რეჟიმი",language:"ენა / Language",pdfLanguage:"PDF ენა",changePassword:"პაროლის შეცვლა",signOutConfirmTitle:"გასვლა",signOutConfirmBody:"დარწმუნებული ხართ?",scaffold3dGuide:"ხარაჩო 3D გიდი",guide3dSafety:"3D Safety Guide / 3D უსაფრთხოების გიდი",cancelSubTitle:"გამოწერის გაუქმება?",cancelSubBodyUntil:"წვდომა გაგრძელდება {{until}}-მდე. ავტომატური განახლება არ მოხდება.",cancelSubBody:"გამოწერა გაუქმდება. ახალი გადახდა არ მოხდება.",sessionMissing:"სესია არ არის",cancelSubSuccessUntil:"წვდომა გაგრძელდება {{until}}-მდე",cancelSubSuccess:"გამოწერა გაუქმდა",paymentStatusPaid:"გადახდილია",paymentStatusPending:"მუშავდება",paymentStatusFailed:"წარუმატებელი",paymentStatusRefunded:"დაბრუნებულია",paymentHistory:"გადახდის ისტორია",planSection:"გეგმა",proActiveUntil:"მოქმედია: {{date}}-მდე",unlimitedPdf:"შეუზღუდავი PDF გენერაცია",cancelSub:"გამოწერის გაუქმება",proExpired:"გამოწერა ამოიწურა",pdfUsage:"PDF გამოყენება",freePlan:"უფასო გეგმა",pdfUsed:"PDF: {{count}}/{{limit}} გამოყენებული"},ye={title:"კალენდარი",sync:"სინქრონიზაცია",filterExpired:"ვადაგასული",filterThisWeek:"ამ კვირას",filterThisMonth:"ამ თვეში",prevMonth:"წინა თვე",nextMonth:"შემდეგი თვე",noTemplate:"შაბლონი არ არის",noProject:"პროექტი ვერ მოიძებნა",chooseTemplate:"აირჩიეთ შაბლონი",createFailed:"შექმნა ვერ მოხერხდა",connectGoogleFirst:"ჯერ მიაერთეთ Google კალენდარი",addedCount:"დაემატა: {{count}}",syncFailed:"სინქრონიზაცია ვერ მოხერხდა",noInspections:"შემოწმების აქტი არ არის ამ დღეს.",today:"დღეს",start:"დაწყება",inspectionCount:"{{count}} შემოწმების აქტი",weekdayLabels:["ორშ","სამ","ოთხ","ხუთ","პარ","შაბ","კვ"],monthLabels:["იანვარი","თებერვალი","მარტი","აპრილი","მაისი","ივნისი","ივლისი","აგვისტო","სექტემბერი","ოქტომბერი","ნოემბერი","დეკემბერი"],monthLabelsShort:["იან","თებ","მარ","აპრ","მაი","ივნ","ივლ","აგვ","სექ","ოქტ","ნოე","დეკ"],filterAll:"ყველა",filterInspection:"შემოწმება",filterBriefing:"ინსტრუქტაჟი",filterOverdue:"ვადა გასული",filterUpcoming:"დაგეგმილი",filterProject:"პროექტი",allProjects:"ყველა პროექტი",goToSite:"დღეს ობიექტზე ვარ",emptyDay:"ამ დღეს მოვლენები არ არის",emptyFilter:"ფილტრი — მოვლენები ვერ მოიძება",allCaughtUp:"ყველა ვადა დაცულია",overdueDays:"{{count}} დღე გადაცილდა",inDays:"{{count}} დღეში",dueToday:"დღეს",jumpToToday:"დღეს",upcomingSection:"შეხსენებები"},xe={title:"რეგულაციები",neverUpdated:"არასდროს",updatedToday:"დღეს, {{time}}",lastUpdate:"ბოლო განახლება: {{date}}",updatedBadge:"განახლდა",updatedDate:"განახლდა: {{date}}",openLinkA11y:"{{title}} — გახსნა",sourceLabel:"matsne.gov.ge"},Se={confirmKa:"დადასტურება",confirmEn:"Confirm",declineWarning:"უარის თქმის შემთხვევაში აპლიკაციიდან გამოხვალ.",cancelKa:"გაუქმება",cancelEn:"Cancel",signOutKa:"გასვლა",signOutEn:"Sign out",langKa:"ქართული",langEn:"English",viewInBrowser:"ვერსიის ნახვა ბრაუზერში",agree:"ვეთანხმები",disagree:"არ ვეთანხმები"},we={saved:"ხელმოწერა შენახულია",saveError:"შენახვა ვერ მოხერხდა",requiredTitle:"ხელმოწერა საჭიროა",requiredDesc:"PDF-ის დასაგენერირებლად საჭიროა ექსპერტის ხელმოწერა.",eyebrow:"ხელმოწერა",fallbackName:"ხელმომწერი",signHereHint:"ხელი მოაწერეთ ჩარჩოში"},Pe={title:"ხელმოწერის გარე მოთხოვნა",description:"ხელის მოწერის ლინკი გაიგზავნება SMS-ით. ლინკი 14 დღეში იწურება.",roleLabel:"როლი",nameLabel:"სახელი გვარი",namePlaceholder:"გიორგი ხელაძე",phoneLabel:"ტელეფონი",phonePlaceholder:"+995 5XX XXX XXX",cancel:"გაუქმება",sendSms:"SMS-ის გაგზავნა"},ke={rolePresets:["ზედამხედველი","ხარაჩოს ამწყობი"],addSheetTitle:"მონაწილის დამატება",nameLabel:"სახელი",namePlaceholder:"მაგ. გიორგი მელაძე",roleLabel:"როლი",saveButton:"შენახვა"},Fe={topics:{scaffold_safety:"ხარაჩოს უსაფრთხოება",height_work:"სიმაღლეზე მუშაობა",ppe:"დამცავი აღჭურვილობა",evacuation:"საევაკუაციო გეგმა",fire_safety:"ხანძარსაწინააღმდეგო",other:"სხვა"},loadFailed:"ინსტრუქტაჟის ჩატვირთვა ვერ მოხერხდა",signatureSaveFailed:"ხელმოწერის შენახვა ვერ მოხერხდა",skipWorkerTitle:"ამ მუშაკის გამოტოვება?",skipWorkerBody:"შეგიძლიათ მოგვიანებით დაბრუნდეთ სიიდან.",skipAction:"გამოტოვება",skipFailed:"გამოტოვება ვერ მოხერხდა",topicNameLabel:"თემის დასახელება",participantNameLabel:"სახელი გვარი",startButton:"დაწყება →",createFailed:"ინსტრუქტაჟის შექმნა ვერ მოხერხდა",backToSkipped:"გამოტოვებულზე დაბრუნება",continueButton:"გააგრძელე →",skippedCountLabel:"{{count}} მუშაკი გამოტოვებული",completeAndPdf:"დასრულება და PDF გენერირება",dateTimeSection:"თარიღი და დრო",topicSection:"ინსტრუქტაჟის თემა",topicHint:"შეარჩიეთ ერთი ან მეტი",topicRequired:"აირჩიეთ მინიმუმ ერთი თემა",participantsSection:"მონაწილეები",participantRequired:"დაამატეთ მინიმუმ ერთი მონაწილე",participantHint:"მინიმუმ 1 მონაწილე საჭიროა",flowTitle:"ინსტრუქტაჟი",inspectorChipLabel:"ინსპექტორი",inspectorChipHint:"ინსპექტორის ხელმოწერა",signerChipHint:"ხელმომწერზე გადასვლა",inspectorEyebrow:"ინსპექტორის ხელმოწერა",inspectorFallbackName:"ინსპექტორი",inspectorSignPrompt:"გთხოვთ მოაწეროთ ხელი",workerEyebrow:"ხელს აწერს",alreadySigned:"უკვე მოწერილია - გადაწერა",signError:"გთხოვთ, ხელი მოაწეროთ",clearBtn:"გასუფთავება",clearBtnA11y:"ხელმოწერის გასუფთავება",savingLabel:"ინახება...",confirmButton:"დადასტურება →",skippedInterstitialBody:"შეგიძლიათ დაუბრუნდეთ მათ ან გააგრძელოთ ინსპექტორის ხელმოწერაზე.",loadingLabel:"იტვირთება..."},$e={tocTitle:"შინაარსი",tocQuestionCount:"{{count}} კითხვა",attachedCerts:"თანდართული სერტიფიკატები",certIssued:"გაცემა: {{date}}",certExpires:"ვადა: {{date}}",imageUnavailable:"სურათი მიუწვდომელია",statusNotSafe:"✗ დაუშვებელია გამოყენება",statusCaution:"⚠ დასაშვებია, საჭიროებს დაკვირვებას",statusSafe:"✓ უსაფრთხოა ექსპლუატაციისთვის",statusIncomplete:"● შეფასება დაუსრულებელია",watermarkDraft:"დრაფტი / DRAFT",previewBanner:"👁 PREVIEW — ეს არის PDF-ის პრევიუ. საბოლოო ვერსია შეიძლება განსხვავდებოდეს.",htmlTitle:"Hubble — {{templateName}}",systemName:"შრომის უსაფრთხოების ექსპერტული სისტემა",footerText:"Hubble · {{systemName}} · გვერდი ",metaDate:"თარიღი: {{date}}",metaObject:"ობიექტი: {{name}}",metaId:"ID: {{id}}",infoCompany:"კომპანია",infoObject:"ობიექტი",infoHarness:"ქამრის დასახელება",infoStatus:"სტატუსი",verdictLabel:"შეფასება",conclusionTitle:"დასკვნა",signaturesTitle:"ხელმოწერები",commentLabel:"კომენტარი",notesLabel:"შენიშვნა",photosTitle:"📷 ფოტო მასალა",yes:"კი",no:"არა",expertLabel:"ექსპერტი",timeLabel:"დრო",locationLabel:"ლოკაცია",deviceLabel:"მოწყობილობა",photoAlt:"ფოტო",signatureAlt:"ხელმოწერა"},Te={subscriptionNotice:{title:"უფასო ლიმიტი ამოიწურა",body:"გამოწერის შეძენა აპლიკაციიდან შეუძლებელია.",usage:"PDF: {{used}} / {{limit}}"},pdfLockedBanner:{label:"PDF ლიმიტი ამოიწურა",details:"დეტალები"},statusBadgePass:"უსაფრთხოა",statusBadgeFail:"არ არის უსაფრთხო",statusBadgePending:"მოლოდინში",offlineBanner:"ხაზგარეშე — ცვლილებები ინახება ლოკალურად",errorStateTitle:"ვერ ჩაიტვირთა",errorStateRetry:"ხელახლა ცდა",errorBoundaryTitle:"მოხდა შეცდომა",errorBoundarySubtitle:"გთხოვთ, სცადოთ თავიდან",errorBoundaryRetry:"თავიდან ცდა",skeletonMapNoLocation:"ლოკაცია არ დაემატა",skeletonMapAddLocation:"ლოკაციის დამატება"},Ce={expert:"შრომის უსაფრთხოების სპეციალისტი",xarachoSupervisor:"ხარაჩოს ზედამხედველი",xarachoAssembler:"ხარაჩოს ამწყობი",other:"სხვა"},De={title:"ანგარიშის პარამეტრები",currentPassword:"მიმდინარე პაროლი",newPassword:"ახალი პაროლი",confirmNewPassword:"გაიმეორეთ ახალი პაროლი",passwordPlaceholder:"პაროლი",repeatPasswordPlaceholder:"გაიმეორეთ პაროლი",changePassword:"პაროლის შეცვლა",changing:"იცვლება…",currentPasswordRequired:"მიმდინარე პაროლი აუცილებელია",currentPasswordWrong:"მიმდინარე პაროლი არასწორია",passwordMinLengthError:"ახალი პაროლი უნდა შეიცავდეს მინიმუმ {{min}} სიმბოლოს",passwordMustDiffer:"ახალი პაროლი უნდა იყოს განსხვავებული",passwordsMismatch:"პაროლები არ ემთხვევა",passwordCharCount:"{{n}}/{{min}} სიმბოლო",passwordChanged:"პაროლი შეიცვალა"},Le={title:"გვერდი არ მოიძებნა",body:"ეს გვერდი არ არსებობს ან წაშლილია.",backHome:"მთავარ გვერდზე"},Ae={title:"პროფილი",emailDisplay:"ელ-ფოსტა: {{email}}",deleteAccountLabel:"ანგარიშის წაშლა",deleteConfirmTitle:"ანგარიშის წაშლა",deleteConfirmBody:"დარწმუნებული ხართ? ეს მოქმედება შეუქცევადია.",updated:"პროფილი განახლდა",deleted:"ანგარიში წაიშალა"},je={cameraPermDenied:"კამერაზე წვდომა აკრძალულია",openSettings:"პარამეტრების გახსნა",library:"ბიბლიოთეკა",done:"დასრულება ({{count}})",libraryPermRequired:"ბიბლიოთეკაზე წვდომა საჭიროა გასაჭრელად",grantAccess:"წვდომის მიცემა"},Be={nameLabel:"დასახელება",modelLabel:"მარკა / მოდელი",serialLabel:"სერ. ნომერი",noteLabel:"შენიშვნა",conditionGood:"კარგი",conditionService:"საჭ. მომს.",conditionUnusable:"გამოუსადეგ.",addPhoto:"+ ფოტო",addRow:"სტრიქონის დამატება",deleteRow:"სტრიქონის წაშლა",conditionGoodA11y:"✓ კარგია",conditionServiceFull:"⚠ საჭ. მომსახ.",conditionUnusableFull:"✗ გამოუსადეგარია",addPhotoA11y:"ფოტოს დამატება",addPhotoHint:"ფოტოს გადაღება ან ბიბლიოთეკიდან",deletePhotoA11y:"ფოტოს წაშლა"},Ee={companyInfo:"კომპანიის ინფო",orderNumber:"ბრძანების ნომერი",orderDate:"ბრძანების თარიღი",companyName:"კომპანიის დასახელება",objectAddress:"ობიექტის მისამართი",directorName:"დირექტორი (სახელი გვარი)",summary:"შეჯამება",orderNumberShort:"ბრძანება №",city:"ქალაქი",code:"კოდი",director:"დირექტორი",object:"ობიექტი",specialist:"სპეციალისტი",idNumber:"პ/ნ",certNumber:"სერტიფიკატი №",assignedPerson:"დანიშნული პირი",certNumberShort:"სერტ. №",crane:"ამწე",directorSigned:"დირექტორი ✓",jobTitle:"თანამდებობა",load:"ტვირთი",operator:"ოპერატორი",operatorSigned:"ოპერატორი ✓",responsible:"პასუხისმგებელი",responsibleSigned:"პასუხისმ. ✓",signed:"ხელმოწერილია",specialistSigned:"სპეციალისტი ✓"},He={title:"შემოწმების აქტი შენახულია!",viewPdf:"PDF-ის ნახვა",backHome:"მთავარ გვერდზე დაბრუნება",summaryLabel:"შეჯამება",description:"ყველა მონაცემი შენახულია. PDF რეპორტის ჩამოტვირთვა და ხელმოწერა შეგიძლიათ აქტის გვერდიდან."},Ne={statusGood:"გამართული",statusBad:"დაზიანებული",componentsMissing:"ამ შაბლონში ქამრის კომპონენტები ვერ მოიძებნა.",exitButton:"გასვლა",harnessCountTitle:"რამდენი ქამარი სულ?",startButton:"დაწყება →",confirmButton:"ქამარი {{n}}{{suffix}} - დადასტურება →",problemsSuffix:" · {{count}} პრობლემა",harnessCountA11y:"ქამრების რაოდენობა",confirmA11y:"ქამარი {{n}} დადასტურება"},qe={chooseProject:"აირჩიეთ პროექტი",continueButton:"გაგრძელება →",newProject:"ახალი პროექტი",newProjectA11y:"ახალი პროექტის შექმნა"},ze={clearTitle:"ყველა მონიშვნის წაშლა",clearBody:"დარწმუნებული ხართ?",saveFailed:"შენახვა ვერ მოხერხდა",saveTryAgain:"სცადეთ თავიდან",addText:"ტექსტის დამატება",headerTitle:"ფოტოს მონიშვნა",saving:"ინახება...",cancelA11yHint:"შეეხეთ მონიშვნის გასაუქმებლად",saveA11yHint:"შეეხეთ დახატული ფოტოს შესანახად",colorA11yPrefix:"ფერი: ",colorA11yHint:"შეეხეთ ამ ფერის ასარჩევად",toolA11yPrefix:"ხელსაწყო: ",toolA11yHint:"შეეხეთ ამ ხელსაწყოს ასარჩევად",widthA11yPrefix:"სისქე: ",widthA11yHint:"შეეხეთ ამ სისქის ასარჩევად",undoA11y:"უკან დაბრუნება",undoA11yHint:"შეეხეთ ბოლო ნაბიჯის გასაუქმებლად",clearAllA11y:"ყველაფრის წაშლა",clearAllA11yHint:"შეეხეთ ყველა მონიშვნის წასაშლელად",cancelTextA11yHint:"შეეხეთ ტექსტის დამატების გასაუქმებლად",addTextA11yHint:"შეეხეთ ტექსტის ფოტოზე დასამატებლად"},_e={discardTitle:"ცვლილებების გაუქმება?",discardBody:"შენახვის გარეშე გასვლისას ცვლილებები დაიკარგება.",problemLabel:"რა პრობლემაა?",discardContinue:"გაგრძელება",discardExit:"გასვლა",kamariIndexTitle:"ქამარი #{{index}}",touchComponentHint:"შეეხეთ კომპონენტს თუ აღმოაჩინეთ პრობლემა",photo:"ფოტო",close:"დახურვა"},Ie={cargoName:"ტვირთის დასახელება",cargoWeight:"სრული წონა (კგ)",deleteRowA11y:"სტრიქონის წაშლა"},Me={otherPlaceholder:"სხვა",quantityLabel:"რაოდენობა",otherA11y:"სხვა"},Re={layout:"განლაგება",layoutTextPhoto:"ტექსტი + ფოტო",layoutPhotoFull:"დიდი ფოტო",layoutTwoSide:"გვერდიგვერდ",layoutTwoStacked:"დაწყობილი",subtitleTextPhoto:"აღწერა გვერდით, ფოტო მარჯვნივ",subtitlePhotoFull:"დიდი ფოტო, სათაური ქვემოთ",subtitleTwoSide:"ორი ფოტო გვერდიგვერდ",subtitleTwoStacked:"ორი ფოტო ერთმანეთის ქვემოთ"},We={deleteTitle:"ინციდენტის წაშლა",deleteBody:"გსურთ ამ ინციდენტის წაშლა?",pdfShareFailed:"PDF-ის გაზიარება ვერ მოხერხდა",pdfPreparing:"მზადდება...",pdfAddingPhotos:"ფოტოები ემატება...",pdfBuilding:"მზადდება PDF...",pdfCreated:"PDF შექმნილია",pdfSavedLocally:"PDF შენახულია ლოკალურად; სინქრონიზაცია მოხდება ქსელზე დაბრუნებისას",pdfCreateFailed:"PDF-ის შექმნა ვერ მოხერხდა",headerTitle:"ინციდენტი",notFound:"ინციდენტი ვერ მოიძებნა",draftChip:"დრაფტი",sectionVictim:"დაზარალებული",sectionCircumstance:"გარემოება",nearMissNote:"საშიში შემთხვევა - დაზიანება არ მომხდარა",fieldName:"სახელი, გვარი",fieldRole:"თანამდებობა",fieldLocation:"ადგილი",fieldProject:"პროექტი",sectionDescription:"შემთხვევის გარემოება",sectionCause:"სავარაუდო მიზეზი",sectionActions:"მიღებული ზომები",sectionWitnesses:"მოწმეები",sectionPhotos:"ფოტო მასალა",labourWarning:"შრომის შემოწმების აქტის სამსახური უნდა ეცნობოს 24 საათის განმავლობაში:",pdfShare:"PDF გაზიარება",pdfUpdate:"განახლება",pdfGenerate:"PDF გენერირება",pdfGenerateLocked:"🔒 PDF გენერირება",newIncident:"ახალი ინციდენტი",reportSubject:"შრომის უსაფრთხოების ინციდენტის ანგარიში",pdfDone:"დასრულდა ✓"},Ue={typeSectionHeader:"ტ-პი / სახ.",identificationSection:"იდენტიფიკაცია",characteristicsSection:"მახასიათებლები",markingSection:"მარკირება",nextInspectionSection:"მომდევნო შემოწმება",serialIdLabel:"სერ. NN / ID",manufacturerLabel:"მწარმოებელი",yearMadeLabel:"წ. წარმ.",wllLabel:"WLL (კგ)",unitSafetyLabel:"ერთ. რ-ბა",typeRequired:"აირჩიეთ ტიპი"},Oe={title:"ალკოტესტი",loadFailed:"ჟურნალის ჩატვირთვა ვერ მოხერხდა",createFailed:"ჟურნალის შექმნა ვერ მოხერხდა",saveFailed:"შენახვა ვერ მოხერხდა",shiftComplete:"ცვლა დასრულდა",error:"შეცდომა - გთხოვთ სცადოთ ხელახლა",statusSafe:"✓ SAFE - სამუშაოდ დაშვება დაშვებულია",statusWarning:"⚠ WARNING - საჭიროა ზედამხედველობა",statusFail:"✗ FAIL - სამუშაოდ დაშვება აკრძალულია",closedBadge:"დასრულებული",noEntryToday:"დღეს ჯერ ჩანაწერი არ დაწყებულა",entryNotFound:"ჩანაწერი ვერ მოიძებნა",startEntry:"დღევანდელი ჩანაწერის დაწყება",noEntry:"ჩანაწერი არ არის · დაიწყე +",personDenied:"პირი ვერ დაიშვება სამუშაოდ",repeatTest:"განმეორებითი ტესტი 15 წუთში",shiftEnd:"ცვლის დასრულება",addEntry:"ჩანაწერის დამატება",pdfFailed:"PDF გენერაცია ვერ მოხერხდა",pdfShare:"PDF გაზიარება",relToday:"დღეს",relDay1:"1 დ.",relDayN:"{{count}} დ.",stepPerson:"პირი",stepTestType:"ტესტის ტიპი",stepResult:"შედეგი",stepSignature:"ხელმოწერა",searchPlaceholder:"სახელი / გვარი...",nameLabel:"სახელი / გვარი",positionLabel:"პოზიცია",primaryTest:"პირველადი",repeatTestType:"↩ განმეორებითი",repeatTestOf:"{{name}}-ის განმეორებითი ტესტი",resultValid:"შეიყვანეთ სწორი მაჩვენებელი",sigPrompt:"{{name}}-მა ხელი მოაწეროს ტესტის შედეგს",sigSaved:"ხელმოწერა შენახულია",tapToSign:"შეეხეთ ხელმოსაწერად",refuseSignature:"ხელმოწერაზე უარი",sigOrRefuseRequired:"საჭიროა ხელმოწერა ან უარის მონიშვნა",nextStep:"შემდეგი →",responsiblePerson:"პასუხისმგებელი პირი",totalTested:"სულ ტესტირებულია: {{count}} პირი",finishAndPdf:"დასრულება და PDF გენერაცია",repeatTestCard:"↩ ტესტი"},Xe={common:ie,a11y:ne,geocode:re,errors:se,notifications:le,tabs:de,auth:ce,home:pe,projects:ue,projectSigner:ge,inspections:me,certificates:fe,qualifications:he,history:be,more:ve,calendar:ye,regulations:xe,termsScreen:Se,signature:we,remoteSigner:Pe,crew:ke,briefings:Fe,pdf:$e,components:Te,roles:Ce,account:De,notFound:Le,profile:Ae,photoPicker:je,generalEquipment:Be,orders:Ee,inspectionDone:He,harnessList:Ne,flowProjectPicker:qe,photoAnnotator:ze,wizard:_e,cargoPlatform:Ie,inputs:Me,reports:Re,incidents:We,slingsId:Ue,breathalyzer:Oe};function W(t,e){const s=t.split(".");let r=Xe;for(const l of s)if(r=r==null?void 0:r[l],r===void 0)break;if(typeof r=="string")return e?r.replace(/\{\{(\w+)\}\}/g,(l,d)=>String(e[d]??"")):r}function Ge(t){const e=new Date(t),s=String(e.getDate()).padStart(2,"0"),r=String(e.getMonth()+1).padStart(2,"0"),l=e.getFullYear(),d=String(e.getHours()).padStart(2,"0"),i=String(e.getMinutes()).padStart(2,"0");return`${s}.${r}.${l} ${d}:${i}`}function _(t){return String(t).padStart(2,"0")}function a(t){return t==null?"":t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function Qe(t,e,s,r){var y,h;const l=a(s.slice(0,50)),d=t.created_at?Ge(t.created_at):"",i=d?`${l} - ${d}`:l,S=((y=t.caption)==null?void 0:y.startsWith("row:"))??!1,p=t.address??((h=t.caption)!=null&&h.startsWith("addr:")?t.caption.slice(5):null);let g="";p?g=`<div class="photo-caption photo-location">გადაღებულია: ${a(p)}</div>`:!S&&t.caption&&(g=`<div class="photo-caption">${a(t.caption)}</div>`);const o=t.storage_path,f=o.startsWith("data:"),C=/^(file|content|ph|asset):\/\//.test(o),D=/^https?:\/\//.test(o);return!f&&!C&&!D?`<div class="photo-item${e?" failed":""}">
      <div class="photo-img-wrap">
        <div class="photo-missing">${r("pdf.imageUnavailable")}</div>
      </div>
      <div class="photo-caption">${i}</div>
      ${g}
    </div>`:`<div class="photo-item${e?" failed":""}">
    <div class="photo-img-wrap">
      <img src="${a(o)}" alt="${a(r("pdf.photoAlt"))}"
        onerror="this.style.display='none';this.parentElement.innerHTML='<div class=\\'photo-missing\\'>${a(r("pdf.imageUnavailable"))}</div>';" />
    </div>
    <div class="photo-caption">${i}</div>
    ${g}
  </div>`}function Ke(t){const e=(t??"").trim().toLocaleLowerCase("ka-GE");return e?/(პრობლემ|აღენიშნება|არა|fail|bad|no|broken|damaged|defect)/i.test(e):!1}function Ve(t){const e=(t??"").trim().toLocaleLowerCase("ka-GE");return e?/(პრობლემ|აღენიშნება|არა|fail|bad|no|broken|damaged|defect)/i.test(e)?"fail":/(კი|ok|pass|yes|good|ok\.|ნორმ|გამართულია)/i.test(e)?"pass":/(არ გააჩნია|^na$|n\/a)/i.test(e)?"neutral":null:null}function R(t,e){return t==="pass"?"კი":t==="fail"?"არა":e&&/კი|ok|pass|yes|good|ok\.|ნორმ|გამართულია|არა|fail|bad|no|broken|damaged|defect/i.test(e)?e:"-"}function Ye(t,e,s=[],r=!1,l){const d=e!=null&&e.comment?`<div class="question-comment">${l("pdf.commentLabel")}: ${a(e.comment)}</div>`:"",i=e!=null&&e.notes?`<div class="question-notes">${l("pdf.notesLabel")}: ${a(e.notes)}</div>`:"",S=s.length===1?"photo-grid single":"photo-grid",p=s.length>0?`<div class="photo-section-title">${l("pdf.photosTitle")}</div>
         <div class="${S}">${s.map(o=>Qe(o,r,t.title,l)).join("")}</div>`:"",g=`question-card${r?" is-failed":""}`;switch(t.type){case"yesno":{const o=e==null?void 0:e.value_bool,f=o===!0?`<span class="answer-pill pill-yes">✓ ${l("pdf.yes")}</span>`:o===!1?`<span class="answer-pill pill-no">✗ ${l("pdf.no")}</span>`:'<span class="pill-empty">-</span>';return`<div class="${g}">
        <div class="question-title">${a(t.title)}</div>
        <div class="question-answer">${f}</div>
        ${d}${i}${p}
      </div>`}case"measure":{const o=e==null?void 0:e.value_num;return`<div class="${g}">
        <div class="question-title">${a(t.title)}</div>
        <div class="question-answer">${o??"-"} ${a(t.unit??"")}</div>
        ${d}${i}${p}
      </div>`}case"freetext":return`<div class="${g}">
        <div class="question-title">${a(t.title)}</div>
        <div class="question-answer">${a((e==null?void 0:e.value_text)??"-")}</div>
        ${d}${i}${p}
      </div>`;case"photo_upload":return`<div class="${g}">
        <div class="question-title">${a(t.title)}</div>
        ${p}${d}${i}
      </div>`;case"component_grid":{const o=t.grid_rows??[],f=t.grid_cols??[],C=(e==null?void 0:e.grid_values)??{},D=f.map(h=>`<th>${a(h)}</th>`).join(""),y=o.map(h=>{const x=f.map(F=>{var $;return(($=C[h])==null?void 0:$[F])??""}),k=x.some(F=>Ke(F)),L=f.map((F,$)=>{const m=x[$],T=Ve(m);return T==="pass"?`<td><span class="cell-status cell-status--pass">${a(R("pass",m))}</span></td>`:T==="fail"?`<td><span class="cell-status cell-status--fail">${a(R("fail",m))}</span></td>`:T==="neutral"?`<td><span class="cell-status cell-status--neutral">${a(R("neutral",m))}</span></td>`:`<td>${a(m)}</td>`}).join("");return`<tr${k?' class="is-problem"':""}><th>${a(h)}</th>${L}</tr>`}).join("");return`<div class="${g}">
        <div class="question-title">${a(t.title)}</div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th></th>${D}</tr></thead>
            <tbody>${y}</tbody>
          </table>
        </div>
        ${d}${i}${p}
      </div>`}default:return""}}const Ze=["იანვარი","თებერვალი","მარტი","აპრილი","მაისი","ივნისი","ივლისი","აგვისტო","სექტემბერი","ოქტომბერი","ნოემბერი","დეკემბერი"];function Je(t){const e=new Date(t);return Number.isNaN(e.getTime())?"":`${e.getDate()} ${Ze[e.getMonth()]} ${e.getFullYear()}`}function et(t){if(!t)return"";const e=!!t.creatorSignature,s=Math.max(0,t.additionalRowsCount|0);if(!e&&s===0)return"";const r=W("pdf.signaturesTitle")??"ხელმოწერები",l=e?tt(t.creatorSignature):"",d=s>0?at(s):"";return`
    <div class="signatures-section">
      <div class="signatures-heading">
        <span class="signatures-heading-text">${a(r)}</span>
        <div class="signatures-heading-rule"></div>
      </div>
      ${l}
      ${d}
    </div>
  `}function tt(t){const e=Je(t.capturedAtIso);return`
    <div class="signatures-creator">
      <div class="signatures-creator-img">
        <img src="data:image/png;base64,${a(t.pngBase64)}" alt="ხელმოწერა" />
      </div>
      <div class="signatures-creator-rule"></div>
      <div class="signatures-creator-meta">
        <span class="signatures-creator-name">${a(t.creatorName||"-")}</span>
        ${e?`<span class="signatures-creator-date">${a(e)}</span>`:""}
      </div>
    </div>
  `}function at(t){const e=[];for(let s=0;s<t;s+=1)e.push(`
      <div class="signatures-empty-slot">
        <div class="signatures-empty-row">
          <span class="signatures-empty-label">ხელმოწერა:</span>
          <span class="signatures-empty-line signatures-empty-line-long"></span>
        </div>
        <div class="signatures-empty-row signatures-empty-row-split">
          <span class="signatures-empty-half">
            <span class="signatures-empty-label">სახელი:</span>
            <span class="signatures-empty-line signatures-empty-line-short"></span>
          </span>
          <span class="signatures-empty-half">
            <span class="signatures-empty-label">თარიღი:</span>
            <span class="signatures-empty-line signatures-empty-line-short"></span>
          </span>
        </div>
      </div>
    `);return e.join("")}function ot(t){if(t.logo)return`<img class="project-brand-logo" src="${a(t.logo)}" alt="${a(t.company_name||t.name)}" />`;const e=(t.company_name||t.name||"").trim(),s=e?Array.from(e).slice(0,2).join("").toLocaleUpperCase("ka-GE"):"-";return`<div class="project-brand-initials">${a(s)}</div>`}function it(){return`
    :root {
      /* ── Brand / structure: monochrome ink + warm neutrals ── */
      --ink:         #1A1A1A;   /* primary text, avatar, section numerals */
      --ink-soft:    #4E4A44;   /* secondary text */
      --gray:        #9C988F;   /* labels / captions */
      --line:        #D6D6D1;   /* hairlines / borders */
      --line-strong: #C2BEB6;   /* header rule, strong dividers */
      --bg-soft:     #F2F1EC;   /* warm surface fills */
      --bg-subtle:   #E9E7E0;   /* table head / zebra rows */

      /* ── Single brand accent: ORANGE ── */
      --accent:      #FF6D2E;   /* the only brand colour; structural accents */
      --accent-soft: #FFF3EE;   /* accent tint */

      /* ── Semantic: verdict + answers ONLY ──
         The brand used to be this green. After the rebrand the only remaining
         --green* consumers are genuinely semantic: the "safe" hero verdict
         bar/value, the "yes" answer pill, and pass grid cells. */
      --green:       #10B981;   /* success — "safe" verdict + pass markers */
      --green-dark:  #0E9C6F;   /* pass text on tint (darkened success) */
      --green-tint:  #D1FAE5;   /* pass pill / status-pass background */
      --red:         #EF4444;   /* danger — unsafe / no */
      --red-tint:    #FEE2E2;   /* fail pill / problem-row background */
      --amber:       #B45309;   /* caution text */
      --amber-bg:    #FEF3C7;   /* caution background */

      /* ── Scale ── */
      --radius:      12px;      /* card radius */
      --radius-lg:   16px;      /* hero card radius */
    }
`}function nt(t){const{isPdf:e}=t;return`
    ${it()}

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Helvetica, Arial, sans-serif;
      color: var(--ink);
      line-height: 1.55;
      background: #ffffff;
      ${e?"padding: 20px;":"padding: 16px;"}
      font-size: 11px;
    }

    /* @page margins removed - caused hangs on iOS WKWebView print renderer.
       Body padding (20px) provides sufficient margin instead. */

    /* Watermark */
    .watermark {
      position: fixed;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%) rotate(-35deg);
      font-size: 96px;
      color: rgba(180, 180, 180, 0.12);
      font-weight: 800;
      pointer-events: none;
      z-index: 0;
      letter-spacing: 8px;
      white-space: nowrap;
    }

    /* ── Header ── */
    .report-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 12px;
      position: relative;
      z-index: 1;
    }
    .header-brand { display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0; }
    .header-titles { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
    .report-title {
      font-size: 18px;
      font-weight: 800;
      color: var(--ink);
      line-height: 1.25;
    }
    .report-company {
      font-size: 10px;
      font-weight: 600;
      color: var(--gray);
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .project-brand-logo,
    .project-brand-initials {
      width: 56px; height: 56px;
      border-radius: 50%;
      display: block;
      flex-shrink: 0;
    }
    .project-brand-logo { object-fit: cover; }
    .project-brand-initials {
      background: var(--ink);
      color: #fff;
      font-weight: 700;
      font-size: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .header-right { flex-shrink: 0; }
    .report-id-chip {
      font-family: 'SF Mono', 'Menlo', monospace;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: var(--ink-soft);
      background: var(--bg-soft);
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 5px 12px;
      white-space: nowrap;
    }
    /* Ink rule carrying a single orange accent tick at its left edge. The tick
       is a real inline element (.header-rule-tick), not a ::before pseudo —
       the WKWebView print path renders real elements far more reliably. */
    .header-rule {
      position: relative;
      height: 2px;
      background: var(--ink);
      border: none;
      margin: 0 0 20px;
    }
    .header-rule-tick {
      position: absolute;
      top: 0; left: 0;
      width: 48px; height: 2px;
      background: var(--accent);
    }

    /* ── Info block ── */
    .info-card {
      border: 1px solid var(--line);
      border-radius: var(--radius);
      padding: 16px;
      margin-bottom: 16px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px 24px;
      position: relative;
      z-index: 1;
    }
    .info-row { display: flex; flex-direction: column; gap: 2px; }
    .info-label {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--gray);
      font-weight: 600;
    }
    .info-value {
      font-size: 13px;
      color: var(--ink);
      font-weight: 600;
    }

    /* ── Hero summary (verdict + conclusion, top of report) ──
       Replaces the old full-bleed .status-hero banner AND the bottom
       .conclusion-card. Neutral card; semantic colour is confined to the
       verdict-coloured left border + verdict value. The single orange accent
       is the conclusion label. border-left (not a flex bar) is used so the
       accent survives the WKWebView print path — same technique the old
       .conclusion-card relied on. */
    .hero-summary {
      background: var(--bg-soft);
      border: 1px solid var(--line);
      border-left: 6px solid var(--gray);
      border-radius: var(--radius-lg);
      padding: 16px 18px;
      margin-bottom: 16px;
      position: relative;
      z-index: 1;
      ${e?"page-break-inside: avoid;":""}
    }
    .hero-summary.is-safe       { border-left-color: var(--green); }
    .hero-summary.is-unsafe     { border-left-color: var(--red); }
    .hero-summary.is-caution    { border-left-color: var(--amber); }
    .hero-summary.is-incomplete { border-left-color: var(--gray); }

    .hero-summary-verdict {
      display: flex;
      align-items: baseline;
      gap: 10px;
      flex-wrap: wrap;
    }
    .hero-verdict-label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--gray);
    }
    .hero-verdict-value {
      font-size: 18px;
      font-weight: 800;
      line-height: 1.25;
    }
    .hero-summary.is-safe       .hero-verdict-value { color: var(--green-dark); }
    .hero-summary.is-unsafe     .hero-verdict-value { color: var(--red); }
    .hero-summary.is-caution    .hero-verdict-value { color: var(--amber); }
    .hero-summary.is-incomplete .hero-verdict-value { color: var(--ink-soft); }

    .hero-summary-conclusion {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--line);
    }
    .hero-conclusion-label {
      display: block;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--accent);
      margin-bottom: 6px;
    }
    .hero-conclusion-text {
      font-size: 13px;
      color: var(--ink);
      line-height: 1.65;
      margin: 0;
    }

    /* ── TOC ── */
    .toc-box {
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: var(--bg-soft);
      padding: 16px;
      margin-bottom: 16px;
      position: relative;
      z-index: 1;
    }
    .toc-heading {
      font-size: 10px;
      font-weight: 800;
      color: var(--ink);
      text-transform: uppercase;
      letter-spacing: 1px;
      padding-left: 10px;
      border-left: 3px solid var(--accent);
      margin-bottom: 12px;
    }
    .toc-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 7px 0;
      border-bottom: 1px solid var(--line);
    }
    .toc-item:last-child { border-bottom: none; }
    .toc-num {
      font-family: 'SF Mono', 'Menlo', monospace;
      font-size: 12px;
      font-weight: 700;
      color: var(--ink);
      min-width: 22px;
    }
    .toc-name { flex: 1; font-size: 12px; color: var(--ink); font-weight: 600; }
    .toc-count { font-size: 10px; color: var(--gray); font-weight: 600; }

    /* ── Section ── */
    .section {
      margin-bottom: 24px;
      position: relative;
      z-index: 1;
    }
    .section-header { margin: 8px 0; }
    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--ink);
      border-left: 3px solid var(--accent);
      padding-left: 10px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .section-num {
      font-family: 'SF Mono', 'Menlo', monospace;
      font-size: 11px;
      font-weight: 800;
      color: #fff;
      background: var(--ink);
      border-radius: 6px;
      padding: 2px 7px;
      line-height: 1.4;
    }
    .section-name { color: var(--ink); }

    /* ── Question card ── */
    .question-card {
      background: #fff;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      padding: 12px 14px;
      margin-bottom: 8px;
      ${e?"page-break-inside: avoid;":""}
    }
    .question-card.is-failed {
      border-left: 3px solid var(--red);
    }
    .question-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--ink);
      margin-bottom: 8px;
    }
    .question-answer { font-size: 12px; color: var(--ink-soft); margin-bottom: 4px; }
    .answer-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 12px;
      border-radius: 999px;
      font-weight: 700;
      font-size: 11px;
      letter-spacing: 0.3px;
    }
    .pill-yes { background: var(--green-tint); color: var(--green-dark); }
    .pill-no  { background: var(--red-tint); color: var(--red); }
    .pill-empty { color: var(--gray); font-style: italic; font-size: 12px; }

    .question-comment {
      font-size: 11px;
      color: var(--ink-soft);
      font-style: italic;
      margin: 8px 0 0;
      padding: 8px 10px;
      background: var(--bg-soft);
      border-radius: 6px;
      border-left: 3px solid var(--line);
    }
    .question-notes {
      font-size: 11px;
      color: var(--amber);
      font-style: italic;
      margin: 8px 0 0;
      padding: 8px 10px;
      background: #FFFBEB;
      border-radius: 6px;
      border-left: 3px solid #F59E0B;
    }

    /* ── Photo grid ── */
    .photo-section-title {
      font-size: 10px;
      font-weight: 600;
      color: var(--gray);
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin: 12px 0 8px;
    }
    .photo-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-top: 8px;
    }
    .photo-grid.single { grid-template-columns: 1fr; }
    .photo-item {
      border: 1px solid var(--line);
      border-radius: var(--radius);
      overflow: hidden;
      background: #fff;
    }
    .photo-img-wrap {
      width: 100%;
      max-height: 200px;
      overflow: hidden;
      background: var(--bg-soft);
    }
    .photo-item img {
      width: 100%;
      max-height: 200px;
      object-fit: cover;
      display: block;
    }
    .photo-caption {
      font-size: 9px;
      color: var(--gray);
      text-align: center;
      padding: 5px 8px;
    }
    .photo-location {
      color: var(--ink-soft);
      font-style: italic;
    }
    .photo-missing {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 160px;
      background: var(--bg-soft);
      font-size: 10px;
      color: var(--gray);
    }

    /* ── Component table ── */
    .table-wrap {
      border: 1px solid var(--line);
      border-radius: var(--radius);
      overflow: hidden;
      margin-top: 8px;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    .data-table thead th { background: var(--bg-subtle); color: var(--ink); }
    .data-table th {
      padding: 8px 10px;
      text-align: left;
      font-weight: 700;
      font-size: 10px;
    }
    .data-table tbody th {
      background: var(--bg-soft);
      color: var(--ink);
      font-weight: 600;
    }
    .data-table td {
      padding: 8px 10px;
      border-top: 1px solid var(--line);
      color: var(--ink);
    }
    .data-table tbody tr:nth-child(even) td,
    .data-table tbody tr:nth-child(even) th { background: var(--bg-soft); }
    .data-table tbody tr.is-problem td,
    .data-table tbody tr.is-problem th {
      background: var(--red-tint);
      border-left: 3px solid var(--red);
    }
    .cell-status { font-weight: 700; }
    .cell-status--pass { color: var(--green-dark); }
    .cell-status--fail { color: var(--red); }
    .cell-status--neutral { color: var(--gray); }

    /* ── Signatures section (creator capture + empty hand-sign slots) ── */
    .signatures-section {
      position: relative;
      z-index: 1;
      margin-top: 24px;
      ${e?"page-break-inside: avoid;":""}
    }
    .signatures-heading {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 14px;
    }
    .signatures-heading-text {
      font-size: 14px;
      font-weight: 700;
      color: var(--ink);
    }
    .signatures-heading-rule { flex: 1; height: 1px; background: var(--line); }

    /* Creator (digital) block */
    .signatures-creator {
      margin-bottom: 18px;
    }
    .signatures-creator-img {
      height: 100px;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      padding: 4px 0;
    }
    .signatures-creator-img img {
      max-height: 100px;
      max-width: 280px;
      display: block;
    }
    .signatures-creator-rule {
      height: 1px;
      background: var(--ink);
      margin-bottom: 6px;
    }
    .signatures-creator-meta {
      display: flex;
      align-items: baseline;
      gap: 12px;
    }
    .signatures-creator-name {
      font-size: 13px;
      font-weight: 700;
      color: var(--ink);
    }
    .signatures-creator-date {
      font-size: 11px;
      color: var(--ink-soft);
    }

    /* Empty hand-sign slots */
    .signatures-empty-slot {
      padding: 10px 0;
      border-top: 1px solid var(--line);
    }
    .signatures-empty-slot:first-child { border-top: none; }
    .signatures-empty-row {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      margin-bottom: 14px;
    }
    .signatures-empty-row:last-child { margin-bottom: 0; }
    .signatures-empty-row-split { gap: 28px; }
    .signatures-empty-half {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      flex: 1;
    }
    .signatures-empty-label {
      font-size: 11px;
      color: var(--ink-soft);
      font-weight: 600;
      white-space: nowrap;
    }
    .signatures-empty-line {
      display: inline-block;
      border-bottom: 1px solid var(--ink);
      align-self: flex-end;
    }
    .signatures-empty-line-long {
      flex: 1;
      height: 80px;
    }
    .signatures-empty-line-short {
      flex: 1;
      height: 40px;
    }

    .audit-trail {
      font-size: 9px;
      color: var(--gray);
      margin-top: 8px;
      border-top: 1px solid var(--line);
      padding-top: 6px;
      text-align: left;
      line-height: 1.5;
    }
    .audit-trail strong { color: var(--ink-soft); font-weight: 600; }

    /* ── Certificates ── */
    .cert-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .cert-card {
      background: #fff;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      padding: 14px;
      ${e?"page-break-inside: avoid;":""}
    }
    .cert-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--ink);
      margin: 0 0 6px;
    }
    .cert-meta-row {
      font-size: 11px;
      color: var(--ink-soft);
      margin-bottom: 2px;
    }
    .cert-meta-label { color: var(--gray); font-weight: 600; }
    .cert-img-wrap {
      position: relative;
      margin-top: 10px;
      width: 100%;
      /* padding-top % gives a 16:9 box in every engine; aspect-ratio is not
         honored by the expo-print/WKWebView print path and collapses to 0. */
      padding-top: 56.25%;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--line);
      background: var(--bg-soft);
    }
    .cert-img {
      position: absolute;
      top: 0;
      left: 0;
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    @media print {
      .question-card, .photo-item, .section, .signatures-section,
      .hero-summary, .cert-card {
        page-break-inside: avoid;
      }
    }
`}function rt(t){var A;const{questionnaire:e,template:s,project:r,questions:l,answers:d,signaturesSession:i=null,photosByAnswer:S={},attachments:p=[],mode:g="pdf"}=t,o=(n,u)=>W(n,u)??n,f=g==="pdf",C=e.status!=="completed",D=n=>d.find(u=>u.question_id===n.id),y=e.created_at?new Date(e.created_at).toLocaleDateString("ka-GE",{year:"numeric",month:"long",day:"numeric"}):"-",h=e.id.slice(0,8).toUpperCase();let x=null;e:for(const n of Object.values(S))for(const u of n){const w=u.address??((A=u.caption)!=null&&A.startsWith("addr:")?u.caption.slice(5):null);if(w){x=w;break e}}const k=Array.from(new Set(l.map(n=>n.section))).sort((n,u)=>n-u),L=k.map((n,u)=>{const w=l.filter(b=>b.section===n);return`<div class="toc-item"><span class="toc-num">${_(u+1)}</span><span class="toc-name">${a(String(n))}</span><span class="toc-count">${o("pdf.tocQuestionCount",{count:w.length})}</span></div>`}).join(""),B=k.map((n,u)=>{const w=l.filter(b=>b.section===n).sort((b,c)=>b.order-c.order).map(b=>{const c=D(b),v=c?S[c.id]??[]:[],q=(c==null?void 0:c.value_bool)===!1;return Ye(b,c,v,q,o)}).join("");return`
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">
              <span class="section-num">${_(u+1)}</span>
              <span class="section-name">${a(String(n))}</span>
            </h2>
          </div>
          <div class="section-body">${w}</div>
        </div>
      `}).join(""),F=et(i),$=p.length>0?`
        <div class="section" ${f?'style="page-break-before: always;"':""}>
          <div class="section-header">
            <h2 class="section-title">
              <span class="section-num">${_(k.length+1)}</span>
              <span class="section-name">${o("pdf.attachedCerts")}</span>
            </h2>
          </div>
          <div class="cert-grid">
            ${p.map(n=>`
              <div class="cert-card">
                <div class="cert-title">${a(n.cert_type)}</div>
                ${n.cert_number?`<div class="cert-meta-row"><span class="cert-meta-label">№</span> ${a(n.cert_number)}</div>`:""}
                ${n.photo_data_url?`<div class="cert-img-wrap">
                      <img src="${n.photo_data_url}" alt="${a(n.cert_type)}" class="cert-img"
                        onerror="this.style.display='none';this.parentElement.innerHTML='<div class=\\'photo-missing\\'>${a(o("pdf.imageUnavailable"))}</div>';" />
                    </div>`:""}
              </div>
            `).join("")}
          </div>
        </div>
      `:"",m=e.safety_verdict??(e.is_safe_for_use===!0?"safe":e.is_safe_for_use===!1?"unsafe":null),T=m==="safe"?"is-safe":m==="unsafe"?"is-unsafe":m==="caution"?"is-caution":"is-incomplete",E=o(m==="safe"?"pdf.statusSafe":m==="caution"?"pdf.statusCaution":m==="unsafe"?"pdf.statusNotSafe":"pdf.statusIncomplete"),H=`
    <div class="hero-summary ${T}">
      <div class="hero-summary-verdict">
        <span class="hero-verdict-label">${o("pdf.verdictLabel")}</span>
        <span class="hero-verdict-value">${E}</span>
      </div>
      <div class="hero-summary-conclusion">
        <span class="hero-conclusion-label">${o("pdf.conclusionTitle")}</span>
        <p class="hero-conclusion-text">${a(e.conclusion_text??"-")}</p>
      </div>
    </div>
  `,N=C?`<div class="watermark">${o("pdf.watermarkDraft")}</div>`:"";return`<!DOCTYPE html>
<html lang="ka">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${o("pdf.htmlTitle",{templateName:a(s.name)})}</title>
  <style>${nt({isPdf:f})}</style>
</head>
<body>
  ${N}

  <div class="report-header">
    <div class="header-brand">
      ${ot(r)}
      <div class="header-titles">
        <div class="report-title">${a(s.name)}</div>
        <div class="report-company">${a(r.company_name)}</div>
      </div>
    </div>
    <div class="header-right">
      <span class="report-id-chip">${h}</span>
    </div>
  </div>
  <div class="header-rule"><span class="header-rule-tick"></span></div>

  <div class="info-card">
    <div class="info-row">
      <span class="info-label">${o("pdf.infoCompany")}</span>
      <span class="info-value">${a(r.company_name)}</span>
    </div>
    <div class="info-row">
      <span class="info-label">${o("pdf.infoObject")}</span>
      <span class="info-value">${a(r.address??"-")}</span>
    </div>
    <div class="info-row">
      <span class="info-label">${o("pdf.metaDate",{date:""}).replace(/[:：].*/,"").trim()||"თარიღი"}</span>
      <span class="info-value">${y}</span>
    </div>
    <div class="info-row">
      <span class="info-label">ID</span>
      <span class="info-value" style="font-family:'SF Mono','Menlo',monospace;font-size:12px;">${h}</span>
    </div>
    ${s.category==="harness"?`
    <div class="info-row" style="grid-column:1 / -1;">
      <span class="info-label">${o("pdf.infoHarness")}</span>
      <span class="info-value">${a(e.harness_name??"-")}</span>
    </div>`:""}
    ${x?`
    <div class="info-row" style="grid-column:1 / -1;">
      <span class="info-label">📍 ლოკაცია</span>
      <span class="info-value">${a(x)}</span>
    </div>`:""}
  </div>

  ${H}

  <div class="toc-box">
    <div class="toc-heading">${o("pdf.tocTitle")}</div>
    ${L}
    ${p.length>0?`
    <div class="toc-item">
      <span class="toc-num">${_(k.length+1)}</span>
      <span class="toc-name">${o("pdf.attachedCerts")}</span>
      <span class="toc-count">${p.length}</span>
    </div>`:""}
  </div>

  ${B}

  ${F}

  ${$}
</body>
</html>`}function mt(){var T,E,H,N,A,n,u,w,b;const{id:t}=G(),[e]=Q(),s=e.get("preview")==="1",l=((T=K().state)==null?void 0:T.signaturesSession)??null,d=z.useRef(null),i=j({queryKey:M.detail(t),queryFn:()=>J(t),enabled:!!t}),S=j({queryKey:V.detail((E=i.data)==null?void 0:E.project_id),queryFn:()=>ee(i.data.project_id),enabled:!!((H=i.data)!=null&&H.project_id)}),p=j({queryKey:["template",(N=i.data)==null?void 0:N.template_id],queryFn:()=>te(i.data.template_id),enabled:!!((A=i.data)!=null&&A.template_id)}),g=j({queryKey:M.questions((n=i.data)==null?void 0:n.template_id),queryFn:()=>ae(i.data.template_id),enabled:!!((u=i.data)!=null&&u.template_id)}),o=j({queryKey:M.answers(t),queryFn:()=>oe(t),enabled:!!t}),[f,C]=z.useState({}),[D,y]=z.useState(!1);z.useEffect(()=>{if(!o.data)return;const c=o.data.map(v=>v.id);if(!c.length){y(!0);return}Y(c).then(async v=>{const q={};await Promise.all(Object.entries(v).map(async([U,O])=>{q[U]=await Promise.all(O.map(async I=>{try{const X=await Z(I.storage_path);return{...I,storage_path:X}}catch{return I}}))})),C(q),y(!0)}).catch(()=>y(!0))},[o.data]);const h=i.isSuccess&&S.isSuccess&&p.isSuccess&&g.isSuccess&&o.isSuccess&&D;if(i.isLoading)return P.jsx("p",{style:{padding:24},children:"იტვირთება…"});if(!i.data)return P.jsx("p",{style:{padding:24},children:"აქტი ვერ მოიძებნა."});if(!h)return P.jsx("p",{style:{padding:24},children:"იტვირთება…"});const x=i.data,k=S.data,L=p.data,B=g.data??[],F=o.data??[],$=L||{id:x.template_id,owner_id:null,name:"შემოწმების აქტი",category:((b=(w=x.template)==null?void 0:w[0])==null?void 0:b.category)??null,is_system:!1,required_qualifications:[],required_signer_roles:[]},m=rt({questionnaire:x,template:$,signaturesSession:l,project:k,questions:B,answers:F,photosByAnswer:f,mode:"pdf"});return P.jsxs(P.Fragment,{children:[P.jsxs("div",{style:{position:"sticky",top:0,background:"#FAFAFA",borderBottom:"1px solid #E5E7EB",padding:"10px 16px",display:"flex",gap:8,justifyContent:"flex-end",zIndex:10},children:[P.jsx("button",{onClick:()=>window.history.back(),style:{padding:"6px 14px",borderRadius:6,fontSize:13,fontWeight:600,cursor:"pointer",border:"1px solid #D1D5DB",background:"#fff"},children:"დახურვა"}),P.jsx("button",{onClick:()=>{var c,v;return(v=(c=d.current)==null?void 0:c.contentWindow)==null?void 0:v.print()},style:{padding:"6px 14px",borderRadius:6,fontSize:13,fontWeight:600,cursor:"pointer",border:"1px solid #2F855A",background:"#2F855A",color:"#fff"},children:"ბეჭდვა"})]}),P.jsx("iframe",{ref:d,srcDoc:m,style:{width:"100%",height:"calc(100vh - 53px)",border:"none",display:"block"},title:"შემოწმების აქტი",onLoad:()=>{var c,v;s||(v=(c=d.current)==null?void 0:c.contentWindow)==null||v.print()}})]})}export{mt as default};
